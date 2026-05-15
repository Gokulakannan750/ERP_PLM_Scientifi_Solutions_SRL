"""
FreeCAD Bridge Server
---------------------
A lightweight Flask REST server that wraps FreeCAD's Python API so the ERP
can open files, export STEP/PDF, and read/write ERP parameters stored in a
FreeCAD spreadsheet named "ERP_Params".

Setup:
  1. Install FreeCAD (https://www.freecad.org/downloads.php)
  2. Set FREECAD_LIB_PATH to the FreeCAD lib directory in your .env, e.g.:
       Windows: C:/Program Files/FreeCAD 1.0/bin
       Linux:   /usr/lib/freecad/lib
  3. pip install -r requirements.txt
  4. python app.py

Endpoints (all match the J-Link bridge contract so the same TS adapter works):
  GET  /health
  POST /file/open        { path }
  POST /file/export/step { path, outputPath? }
  POST /file/export/pdf  { path, outputPath? }
  POST /params/set       { path, params }
  GET  /params/get?path=...
"""

import os
import sys
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

# ── FreeCAD discovery ────────────────────────────────────────────────────────
FREECAD_LIB_PATH = os.environ.get('FREECAD_LIB_PATH', '')
if FREECAD_LIB_PATH and FREECAD_LIB_PATH not in sys.path:
    sys.path.insert(0, FREECAD_LIB_PATH)

try:
    import FreeCAD
    import Part
    FREECAD_AVAILABLE = True
    FREECAD_VERSION = '.'.join(str(v) for v in FreeCAD.Version()[:3])
except ImportError:
    FREECAD_AVAILABLE = False
    FREECAD_VERSION = None

# ── App setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(','))

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

PORT = int(os.environ.get('FREECAD_SERVER_PORT', 7474))


def _require_freecad():
    if not FREECAD_AVAILABLE:
        return jsonify({'success': False, 'error': 'FreeCAD is not available on this server. Check FREECAD_LIB_PATH.'}), 503
    return None


def _open_doc(path: str):
    """Open a FreeCAD document; raises FileNotFoundError if path missing."""
    if not path:
        raise ValueError('path is required')
    if not os.path.exists(path):
        raise FileNotFoundError(f'File not found: {path}')
    return FreeCAD.openDocument(path)


def _close_doc(doc):
    try:
        FreeCAD.closeDocument(doc.Name)
    except Exception:
        pass


# ── Routes ───────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'freecad_available': FREECAD_AVAILABLE,
        'freecad_version': FREECAD_VERSION,
    })


@app.route('/file/open', methods=['POST'])
def open_file():
    err = _require_freecad()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    path = data.get('path', '')
    log.info('open_file: %s', path)

    try:
        doc = _open_doc(path)
        # Keep the document open in-session (caller is just "opening" it for
        # viewing; we leave closing to the next operation or idle timeout).
        return jsonify({'success': True})
    except (FileNotFoundError, ValueError) as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        log.exception('open_file failed')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/file/export/step', methods=['POST'])
def export_step():
    err = _require_freecad()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    path = data.get('path', '')
    output_path = data.get('outputPath') or (os.path.splitext(path)[0] + '.step')
    log.info('export_step: %s -> %s', path, output_path)

    doc = None
    try:
        doc = _open_doc(path)
        objects = [o for o in doc.Objects if o.isDerivedFrom('Part::Feature')]
        if not objects:
            objects = list(doc.Objects)
        if not objects:
            return jsonify({'success': False, 'error': 'No exportable objects found in document'}), 400

        Part.export(objects, output_path)
        return jsonify({'success': True, 'filePath': output_path})
    except (FileNotFoundError, ValueError) as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        log.exception('export_step failed')
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if doc:
            _close_doc(doc)


@app.route('/file/export/pdf', methods=['POST'])
def export_pdf():
    err = _require_freecad()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    path = data.get('path', '')
    output_path = data.get('outputPath') or (os.path.splitext(path)[0] + '.pdf')
    log.info('export_pdf: %s -> %s', path, output_path)

    doc = None
    try:
        doc = _open_doc(path)

        # Prefer TechDraw pages (FreeCAD 0.19+)
        try:
            import TechDrawGui
            pages = [o for o in doc.Objects if o.isDerivedFrom('TechDraw::DrawPage')]
            if pages:
                TechDrawGui.exportPageAsPdf(pages[0], output_path)
                return jsonify({'success': True, 'filePath': output_path})
        except ImportError:
            pass

        # Fallback: Drawing workbench (FreeCAD < 0.19)
        try:
            import Drawing
            pages = [o for o in doc.Objects if o.isDerivedFrom('Drawing::FeaturePage')]
            if pages:
                Drawing.writeDXFPage(pages[0], output_path)
                return jsonify({'success': True, 'filePath': output_path})
        except ImportError:
            pass

        return jsonify({
            'success': False,
            'error': 'No TechDraw or Drawing page found in document. Add a drawing page to enable PDF export.',
        }), 400

    except (FileNotFoundError, ValueError) as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        log.exception('export_pdf failed')
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if doc:
            _close_doc(doc)


@app.route('/params/set', methods=['POST'])
def set_params():
    err = _require_freecad()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    path = data.get('path', '')
    params: dict = data.get('params', {})
    log.info('set_params: %s keys=%s', path, list(params.keys()))

    doc = None
    try:
        doc = _open_doc(path)

        sheet = doc.getObject('ERP_Params')
        if sheet is None:
            sheet = doc.addObject('Spreadsheet::Sheet', 'ERP_Params')

        # Write key/value pairs starting at row 1
        for i, (key, value) in enumerate(params.items(), start=1):
            sheet.set(f'A{i}', str(key))
            sheet.set(f'B{i}', str(value))

        doc.recompute()
        doc.save()
        return jsonify({'success': True})

    except (FileNotFoundError, ValueError) as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        log.exception('set_params failed')
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if doc:
            _close_doc(doc)


@app.route('/params/get', methods=['GET'])
def get_params():
    err = _require_freecad()
    if err:
        return err

    path = request.args.get('path', '')
    log.info('get_params: %s', path)

    doc = None
    try:
        doc = _open_doc(path)
        result: dict[str, str] = {}

        sheet = doc.getObject('ERP_Params')
        if sheet:
            for row in range(1, 200):
                try:
                    key = sheet.get(f'A{row}')
                    if not key:
                        break
                    value = sheet.get(f'B{row}')
                    result[str(key)] = str(value) if value is not None else ''
                except Exception:
                    break

        # Populate standard fields from doc metadata if not already set
        result.setdefault('DESCRIPTION', getattr(doc, 'Label', ''))

        return jsonify(result)

    except (FileNotFoundError, ValueError) as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        log.exception('get_params failed')
        return jsonify({}), 500
    finally:
        if doc:
            _close_doc(doc)


# ── Entry point ──────────────────────────────────────────────────────────────

if __name__ == '__main__':
    log.info('FreeCAD Bridge Server starting on port %d', PORT)
    log.info('FreeCAD available: %s  version: %s', FREECAD_AVAILABLE, FREECAD_VERSION)
    app.run(host='0.0.0.0', port=PORT, debug=os.environ.get('FLASK_DEBUG', '0') == '1')
