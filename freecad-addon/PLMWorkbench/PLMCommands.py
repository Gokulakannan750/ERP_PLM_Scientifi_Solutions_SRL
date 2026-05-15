"""
PLMCommands.py – FreeCAD command implementations for the PLM Vault workbench.

Each class follows the FreeCAD command protocol:
  GetResources() -> dict   (MenuText, Accel, ToolTip, Pixmap)
  IsActive()     -> bool
  Activated()    -> None

Registered via FreeCADGui.addCommand("PLM_Xxx", Xxx()) at module load time.

API contract (Express server, port 5000):
  POST /api/auth/login              { username, password } -> { token }
  GET  /api/plm/items               -> [{ id, sku, name, type, state, vaultFileName, vaultVersion, checkedOutBy }]
  POST /api/plm/items               { name, type, description } -> item
  POST /api/plm/items/:id/checkout  -> { downloadUrl? }
  GET  /api/plm/items/:id/vault/download  -> file stream
  POST /api/plm/items/:id/checkin   multipart cadFile -> item
  PATCH /api/plm/items/:id          { customFields } -> item
"""

import os
import sys

import FreeCAD
import FreeCADGui

# ── PySide compatibility (FreeCAD bundles PySide2; newer builds may ship PySide6) ─
try:
    from PySide2 import QtCore, QtGui, QtWidgets
except ImportError:
    from PySide6 import QtCore, QtGui, QtWidgets  # type: ignore


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

_ADDON_DIR = os.path.dirname(__file__)
_ICONS_DIR = os.path.join(_ADDON_DIR, "icons")


def icon_path(name: str) -> str:
    p = os.path.join(_ICONS_DIR, name)
    return p if os.path.exists(p) else ""


def _get_prefs():
    p = FreeCAD.ParamGet("User parameter:BaseApp/Preferences/PLM")
    return {
        "server": p.GetString("ServerURL", "http://localhost:5000/api"),
        "token":  p.GetString("Token", ""),
    }


def _save_prefs(server=None, token=None):
    p = FreeCAD.ParamGet("User parameter:BaseApp/Preferences/PLM")
    if server is not None:
        p.SetString("ServerURL", server)
    if token is not None:
        p.SetString("Token", token)


def _auth_headers(json_body=True):
    t = _get_prefs()["token"]
    h = {"Authorization": f"Bearer {t}"}
    if json_body:
        h["Content-Type"] = "application/json"
    return h


def _get(endpoint):
    import requests
    p = _get_prefs()
    r = requests.get(f"{p['server']}{endpoint}", headers=_auth_headers(), timeout=30)
    r.raise_for_status()
    return r.json()


def _post_json(endpoint, data):
    import requests
    p = _get_prefs()
    r = requests.post(f"{p['server']}{endpoint}", headers=_auth_headers(), json=data, timeout=30)
    r.raise_for_status()
    return r.json()


def _patch_json(endpoint, data):
    import requests
    p = _get_prefs()
    r = requests.patch(f"{p['server']}{endpoint}", headers=_auth_headers(), json=data, timeout=30)
    r.raise_for_status()
    return r.json()


def _post_file(endpoint, file_path):
    """POST a multipart file to endpoint (cadFile field)."""
    import requests
    p = _get_prefs()
    with open(file_path, "rb") as fh:
        r = requests.post(
            f"{p['server']}{endpoint}",
            headers=_auth_headers(json_body=False),
            files={"cadFile": (os.path.basename(file_path), fh)},
            timeout=300,
        )
    r.raise_for_status()
    return r.json()


def _download(endpoint, dest_path):
    """Stream a file from endpoint to dest_path, returns dest_path."""
    import requests
    p = _get_prefs()
    with requests.get(
        f"{p['server']}{endpoint}",
        headers=_auth_headers(json_body=False),
        stream=True,
        timeout=120,
    ) as r:
        r.raise_for_status()
        with open(dest_path, "wb") as fh:
            for chunk in r.iter_content(chunk_size=65536):
                fh.write(chunk)
    return dest_path


def _err(msg: str):
    QtWidgets.QMessageBox.critical(FreeCADGui.getMainWindow(), "PLM Error", msg)


def _info(msg: str):
    QtWidgets.QMessageBox.information(FreeCADGui.getMainWindow(), "PLM", msg)


def _work_dir():
    """Folder where checked-out files land. Defaults to user home / PLM_Checkout."""
    p = FreeCAD.ParamGet("User parameter:BaseApp/Preferences/PLM")
    d = p.GetString("WorkDir", os.path.join(os.path.expanduser("~"), "PLM_Checkout"))
    os.makedirs(d, exist_ok=True)
    return d


# ─────────────────────────────────────────────────────────────────────────────
# PLM_Settings
# ─────────────────────────────────────────────────────────────────────────────

class _SettingsDialog(QtWidgets.QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("PLM Settings")
        self.setMinimumWidth(420)

        prefs = _get_prefs()

        form = QtWidgets.QFormLayout()
        self.server_edit = QtWidgets.QLineEdit(prefs["server"])
        self.user_edit   = QtWidgets.QLineEdit()
        self.pass_edit   = QtWidgets.QLineEdit()
        self.pass_edit.setEchoMode(QtWidgets.QLineEdit.Password)
        self.work_edit   = QtWidgets.QLineEdit(_work_dir())

        browse = QtWidgets.QPushButton("…")
        browse.setFixedWidth(28)
        browse.clicked.connect(self._browse)

        row = QtWidgets.QHBoxLayout()
        row.addWidget(self.work_edit)
        row.addWidget(browse)

        form.addRow("Server URL:", self.server_edit)
        form.addRow("Username:",   self.user_edit)
        form.addRow("Password:",   self.pass_edit)
        form.addRow("Checkout dir:", row)

        self.status = QtWidgets.QLabel("")
        self.status.setStyleSheet("color: gray;")

        buttons = QtWidgets.QDialogButtonBox(
            QtWidgets.QDialogButtonBox.Ok | QtWidgets.QDialogButtonBox.Cancel
        )
        buttons.accepted.connect(self._accept)
        buttons.rejected.connect(self.reject)

        layout = QtWidgets.QVBoxLayout(self)
        layout.addLayout(form)
        layout.addWidget(self.status)
        layout.addWidget(buttons)

    def _browse(self):
        d = QtWidgets.QFileDialog.getExistingDirectory(self, "Select checkout directory", self.work_edit.text())
        if d:
            self.work_edit.setText(d)

    def _accept(self):
        import requests
        server = self.server_edit.text().rstrip("/")
        user   = self.user_edit.text().strip()
        pwd    = self.pass_edit.text()
        work   = self.work_edit.text().strip()

        if not server:
            _err("Server URL is required.")
            return

        token = _get_prefs()["token"]

        if user:
            self.status.setText("Logging in…")
            QtWidgets.QApplication.processEvents()
            try:
                r = requests.post(
                    f"{server}/auth/login",
                    json={"username": user, "password": pwd},
                    timeout=15,
                )
                r.raise_for_status()
                token = r.json().get("token", "")
                if not token:
                    _err("Login succeeded but no token returned.")
                    return
                self.status.setText("Logged in successfully.")
            except Exception as e:
                _err(f"Login failed: {e}")
                return

        _save_prefs(server=server, token=token)

        p = FreeCAD.ParamGet("User parameter:BaseApp/Preferences/PLM")
        if work:
            p.SetString("WorkDir", work)
            os.makedirs(work, exist_ok=True)

        self.accept()


class CmdSettings:
    def GetResources(self):
        return {
            "MenuText": "PLM Settings",
            "ToolTip":  "Configure PLM server URL and login credentials",
            "Pixmap":   icon_path("plm_settings.svg"),
        }

    def IsActive(self):
        return True

    def Activated(self):
        dlg = _SettingsDialog(FreeCADGui.getMainWindow())
        dlg.exec_()


# ─────────────────────────────────────────────────────────────────────────────
# PLM_NewItem
# ─────────────────────────────────────────────────────────────────────────────

class _NewItemDialog(QtWidgets.QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("New PLM Item")
        self.setMinimumWidth(380)

        form = QtWidgets.QFormLayout()
        self.name_edit  = QtWidgets.QLineEdit()
        self.desc_edit  = QtWidgets.QLineEdit()
        self.type_combo = QtWidgets.QComboBox()
        self.type_combo.addItems(["P - Part", "A - Assembly", "C - Commercial", "D - Drawing"])

        form.addRow("Name:",        self.name_edit)
        form.addRow("Type:",        self.type_combo)
        form.addRow("Description:", self.desc_edit)

        self.open_check = QtWidgets.QCheckBox("Open new document in FreeCAD")
        self.open_check.setChecked(True)

        buttons = QtWidgets.QDialogButtonBox(
            QtWidgets.QDialogButtonBox.Ok | QtWidgets.QDialogButtonBox.Cancel
        )
        buttons.accepted.connect(self._accept)
        buttons.rejected.connect(self.reject)

        layout = QtWidgets.QVBoxLayout(self)
        layout.addLayout(form)
        layout.addWidget(self.open_check)
        layout.addWidget(buttons)

        self.result_item = None

    def _accept(self):
        name = self.name_edit.text().strip()
        if not name:
            _err("Name is required.")
            return

        try:
            resp = _post_json("/plm/items", {
                "name":        name,
                "plmType":     self.type_combo.currentText()[0],
                "description": self.desc_edit.text().strip(),
            })
            # Server returns { item, template, templateFileCopy }
            self.result_item = resp.get("item", resp)
            self.accept()
        except Exception as e:
            _err(f"Could not create PLM item: {e}")


class CmdNewItem:
    def GetResources(self):
        return {
            "MenuText": "New PLM Item",
            "ToolTip":  "Create a new PLM item and open a FreeCAD document for it",
            "Pixmap":   icon_path("plm_new.svg"),
        }

    def IsActive(self):
        return bool(_get_prefs()["token"])

    def Activated(self):
        dlg = _NewItemDialog(FreeCADGui.getMainWindow())
        if dlg.exec_() != QtWidgets.QDialog.Accepted:
            return

        item = dlg.result_item
        sku  = item.get("sku", item.get("id", "NEW"))

        if dlg.open_check.isChecked():
            # If the item already has a vault file, download it; otherwise new doc
            if item.get("vaultFileName"):
                _checkout_and_open(item)
            else:
                doc = FreeCAD.newDocument(sku)
                # Store the PLM item ID in doc metadata so checkin knows which item to update
                doc.Meta = {"PLM_ID": str(item["id"]), "PLM_SKU": sku}
                FreeCADGui.getDocument(doc.Name).ActiveView.viewIsometric()
                _info(f"Created PLM item {sku}.\nDocument opened. Design, then use Check In to upload to the vault.")
        else:
            _info(f"PLM item created: {sku}")


# ─────────────────────────────────────────────────────────────────────────────
# PLM_CheckOut
# ─────────────────────────────────────────────────────────────────────────────

class _CheckOutDialog(QtWidgets.QDialog):
    def __init__(self, items, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Check Out PLM Item")
        self.setMinimumSize(580, 400)

        self.table = QtWidgets.QTableWidget(0, 5)
        self.table.setHorizontalHeaderLabels(["SKU", "Name", "Type", "State", "Vault"])
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.setSelectionBehavior(QtWidgets.QAbstractItemView.SelectRows)
        self.table.setEditTriggers(QtWidgets.QAbstractItemView.NoEditTriggers)
        self.table.verticalHeader().setVisible(False)

        for item in items:
            row = self.table.rowCount()
            self.table.insertRow(row)
            self.table.setItem(row, 0, QtWidgets.QTableWidgetItem(item.get("sku", "")))
            self.table.setItem(row, 1, QtWidgets.QTableWidgetItem(item.get("name", "")))
            self.table.setItem(row, 2, QtWidgets.QTableWidgetItem(item.get("type", "")))
            self.table.setItem(row, 3, QtWidgets.QTableWidgetItem(item.get("state", "")))
            vault_txt = f"v{item['vaultVersion']}" if item.get("vaultFileName") else "—"
            self.table.setItem(row, 4, QtWidgets.QTableWidgetItem(vault_txt))

        self.table.resizeColumnsToContents()

        search = QtWidgets.QLineEdit()
        search.setPlaceholderText("Filter by SKU or name…")
        search.textChanged.connect(self._filter)

        buttons = QtWidgets.QDialogButtonBox(
            QtWidgets.QDialogButtonBox.Ok | QtWidgets.QDialogButtonBox.Cancel
        )
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)

        layout = QtWidgets.QVBoxLayout(self)
        layout.addWidget(search)
        layout.addWidget(self.table)
        layout.addWidget(buttons)

        self._items = items

    def _filter(self, text):
        text = text.lower()
        for row in range(self.table.rowCount()):
            sku  = self.table.item(row, 0).text().lower()
            name = self.table.item(row, 1).text().lower()
            self.table.setRowHidden(row, text not in sku and text not in name)

    def selected_item(self):
        rows = self.table.selectedItems()
        if not rows:
            return None
        row = self.table.currentRow()
        return self._items[row]


def _checkout_and_open(item):
    """Call checkout API, download vault file, open in FreeCAD."""
    item_id = item["id"]
    sku     = item.get("sku", str(item_id))

    try:
        result = _post_json(f"/plm/items/{item_id}/checkout", {})
    except Exception as e:
        _err(f"Checkout failed: {e}")
        return

    updated_item   = result.get("item", result)
    checked_out_by = updated_item.get("checkedOutBy")
    if checked_out_by and checked_out_by != result.get("userId"):
        ans = QtWidgets.QMessageBox.question(
            FreeCADGui.getMainWindow(), "Already Checked Out",
            f"This item is checked out by {checked_out_by}.\n"
            "You can still download a read-only copy. Continue?",
            QtWidgets.QMessageBox.Yes | QtWidgets.QMessageBox.No,
        )
        if ans != QtWidgets.QMessageBox.Yes:
            return

    if not item.get("vaultFileName"):
        _info(f"Item {sku} checked out (no vault file yet). Use Check In to upload the first version.")
        return

    vault_name = item["vaultFileName"]
    ext        = os.path.splitext(vault_name)[1] or ".FCStd"
    dest       = os.path.join(_work_dir(), f"{sku}{ext}")

    try:
        prog = QtWidgets.QProgressDialog(
            f"Downloading {vault_name}…", "Cancel", 0, 0, FreeCADGui.getMainWindow()
        )
        prog.setWindowModality(QtCore.Qt.WindowModal)
        prog.show()
        QtWidgets.QApplication.processEvents()

        _download(f"/plm/items/{item_id}/vault/download", dest)
        prog.close()
    except Exception as e:
        prog.close()
        _err(f"Download failed: {e}")
        return

    try:
        doc = FreeCAD.openDocument(dest)
        doc.Meta = {"PLM_ID": str(item_id), "PLM_SKU": sku}
        FreeCADGui.getDocument(doc.Name).ActiveView.viewIsometric()
    except Exception as e:
        _err(f"File downloaded to {dest} but FreeCAD could not open it:\n{e}")
        return

    _info(f"Checked out: {sku}\nFile: {dest}")


class CmdCheckOut:
    def GetResources(self):
        return {
            "MenuText": "Check Out",
            "ToolTip":  "Check out a PLM item: lock it and download the vault file",
            "Pixmap":   icon_path("plm_checkout.svg"),
        }

    def IsActive(self):
        return bool(_get_prefs()["token"])

    def Activated(self):
        try:
            items = _get("/plm/items")
            if isinstance(items, dict):
                items = items.get("items", items.get("data", []))
        except Exception as e:
            _err(f"Could not load PLM items: {e}")
            return

        dlg = _CheckOutDialog(items, FreeCADGui.getMainWindow())
        if dlg.exec_() != QtWidgets.QDialog.Accepted:
            return

        item = dlg.selected_item()
        if not item:
            _err("No item selected.")
            return

        _checkout_and_open(item)


# ─────────────────────────────────────────────────────────────────────────────
# PLM_CheckIn
# ─────────────────────────────────────────────────────────────────────────────

def _find_plm_meta(doc):
    """Return (plm_id, sku) from doc.Meta dict, or (None, None)."""
    meta = getattr(doc, "Meta", {}) or {}
    plm_id = meta.get("PLM_ID") or meta.get("plm_id")
    sku    = meta.get("PLM_SKU") or meta.get("plm_sku")
    return plm_id, sku


class _CheckInDialog(QtWidgets.QDialog):
    def __init__(self, plm_id, sku, file_path, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Check In")
        self.setMinimumWidth(420)

        self.plm_id    = plm_id
        self.sku       = sku
        self.file_path = file_path

        info = QtWidgets.QLabel(
            f"<b>Item:</b> {sku}<br>"
            f"<b>File:</b> {os.path.basename(file_path)}<br>"
            f"<b>PLM ID:</b> {plm_id}"
        )
        self.comment_edit = QtWidgets.QPlainTextEdit()
        self.comment_edit.setPlaceholderText("Check-in comment (optional)…")
        self.comment_edit.setMaximumHeight(80)

        buttons = QtWidgets.QDialogButtonBox(
            QtWidgets.QDialogButtonBox.Ok | QtWidgets.QDialogButtonBox.Cancel
        )
        buttons.button(QtWidgets.QDialogButtonBox.Ok).setText("Check In")
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)

        layout = QtWidgets.QVBoxLayout(self)
        layout.addWidget(info)
        layout.addWidget(QtWidgets.QLabel("Comment:"))
        layout.addWidget(self.comment_edit)
        layout.addWidget(buttons)


class CmdCheckIn:
    def GetResources(self):
        return {
            "MenuText": "Check In",
            "ToolTip":  "Save current document and upload it to the PLM vault",
            "Pixmap":   icon_path("plm_checkin.svg"),
        }

    def IsActive(self):
        return bool(_get_prefs()["token"]) and FreeCAD.ActiveDocument is not None

    def Activated(self):
        doc = FreeCAD.ActiveDocument
        if not doc:
            _err("No active FreeCAD document.")
            return

        plm_id, sku = _find_plm_meta(doc)

        # If no metadata, ask the user to pick a PLM item
        if not plm_id:
            plm_id, sku = self._pick_item()
            if not plm_id:
                return
            doc.Meta = {"PLM_ID": str(plm_id), "PLM_SKU": sku}

        # Save the document before uploading
        try:
            if not doc.FileName:
                save_path = os.path.join(_work_dir(), f"{sku}.FCStd")
                doc.saveAs(save_path)
            else:
                doc.save()
        except Exception as e:
            _err(f"Could not save document: {e}")
            return

        file_path = doc.FileName

        dlg = _CheckInDialog(plm_id, sku, file_path, FreeCADGui.getMainWindow())
        if dlg.exec_() != QtWidgets.QDialog.Accepted:
            return

        try:
            prog = QtWidgets.QProgressDialog(
                "Uploading to vault…", "Cancel", 0, 0, FreeCADGui.getMainWindow()
            )
            prog.setWindowModality(QtCore.Qt.WindowModal)
            prog.show()
            QtWidgets.QApplication.processEvents()

            result = _post_file(f"/plm/items/{plm_id}/checkin", file_path)
            prog.close()
        except Exception as e:
            prog.close()
            _err(f"Check-in failed: {e}")
            return

        new_ver = result.get("vaultVersion") or result.get("item", {}).get("vaultVersion", "?")
        _info(f"Check-in successful.\nItem: {sku}   Vault version: {new_ver}")

    def _pick_item(self):
        try:
            items = _get("/plm/items")
            if isinstance(items, dict):
                items = items.get("items", items.get("data", []))
        except Exception as e:
            _err(f"Could not load PLM items: {e}")
            return None, None

        dlg = _CheckOutDialog(items, FreeCADGui.getMainWindow())
        dlg.setWindowTitle("Link to PLM Item (for Check-In)")
        if dlg.exec_() != QtWidgets.QDialog.Accepted:
            return None, None

        item = dlg.selected_item()
        if not item:
            return None, None
        return str(item["id"]), item.get("sku", str(item["id"]))


# ─────────────────────────────────────────────────────────────────────────────
# PLM_SyncParams
# ─────────────────────────────────────────────────────────────────────────────

def _read_spreadsheet(doc):
    """Read the ERP_Params spreadsheet, return dict of key→value."""
    sheet = doc.getObject("ERP_Params")
    if sheet is None:
        return {}
    result = {}
    for row in range(1, 200):
        try:
            key = sheet.get(f"A{row}")
            if not key:
                break
            val = sheet.get(f"B{row}")
            result[str(key)] = str(val) if val is not None else ""
        except Exception:
            break
    return result


def _write_spreadsheet(doc, params: dict):
    """Write params to the ERP_Params spreadsheet, creating it if missing."""
    sheet = doc.getObject("ERP_Params")
    if sheet is None:
        sheet = doc.addObject("Spreadsheet::Sheet", "ERP_Params")
    for i, (key, val) in enumerate(params.items(), start=1):
        sheet.set(f"A{i}", str(key))
        sheet.set(f"B{i}", str(val))
    doc.recompute()


class CmdSyncParams:
    def GetResources(self):
        return {
            "MenuText": "Sync Params",
            "ToolTip":  "Push ERP_Params spreadsheet values to the PLM item metadata",
            "Pixmap":   icon_path("plm_sync.svg"),
        }

    def IsActive(self):
        return bool(_get_prefs()["token"]) and FreeCAD.ActiveDocument is not None

    def Activated(self):
        doc = FreeCAD.ActiveDocument
        if not doc:
            _err("No active FreeCAD document.")
            return

        plm_id, sku = _find_plm_meta(doc)
        if not plm_id:
            _err(
                "This document is not linked to a PLM item.\n"
                "Use Check Out or Check In first to link it."
            )
            return

        params = _read_spreadsheet(doc)

        try:
            item = _get(f"/plm/items/{plm_id}")
        except Exception as e:
            _err(f"Could not fetch PLM item: {e}")
            return

        # Merge spreadsheet values into item's customFields
        existing = item.get("customFields") or {}
        if isinstance(existing, str):
            import json as _json
            try:
                existing = _json.loads(existing)
            except Exception:
                existing = {}

        existing.update(params)

        try:
            _patch_json(f"/plm/items/{plm_id}", {"customFields": existing})
        except Exception as e:
            _err(f"Could not update PLM item: {e}")
            return

        _info(f"Synced {len(params)} parameter(s) to PLM item {sku}.")


# ─────────────────────────────────────────────────────────────────────────────
# Register all commands
# ─────────────────────────────────────────────────────────────────────────────

FreeCADGui.addCommand("PLM_Settings",  CmdSettings())
FreeCADGui.addCommand("PLM_NewItem",   CmdNewItem())
FreeCADGui.addCommand("PLM_CheckOut",  CmdCheckOut())
FreeCADGui.addCommand("PLM_CheckIn",   CmdCheckIn())
FreeCADGui.addCommand("PLM_SyncParams", CmdSyncParams())
