"""
install.py – run this script once to install the PLM Workbench into FreeCAD.

Usage (from a normal Python prompt, NOT inside FreeCAD):
    python install.py

What it does:
  1. Locates the FreeCAD user Mod directory  (~/.FreeCAD/Mod  or  %APPDATA%/FreeCAD/Mod)
  2. Copies the PLMWorkbench folder there
  3. Prints a confirmation message

After running, restart FreeCAD – the "PLM Vault" workbench and toolbar will appear.
"""

import os
import sys
import shutil
import platform

def find_freecad_mod_dir():
    system = platform.system()
    if system == "Windows":
        appdata = os.environ.get("APPDATA", "")
        freecad_root = os.path.join(appdata, "FreeCAD")
        # FreeCAD 1.x uses a versioned subfolder (e.g. v1-1); prefer it over the root
        versioned = sorted(
            [d for d in (os.listdir(freecad_root) if os.path.isdir(freecad_root) else [])
             if d.startswith("v")],
            reverse=True,
        )
        candidates = []
        if versioned:
            candidates.append(os.path.join(freecad_root, versioned[0], "Mod"))
        candidates += [
            os.path.join(freecad_root, "Mod"),
            os.path.join(os.path.expanduser("~"), "AppData", "Roaming", "FreeCAD", "Mod"),
        ]
    elif system == "Darwin":
        candidates = [
            os.path.expanduser("~/Library/Preferences/FreeCAD/Mod"),
        ]
    else:
        candidates = [
            os.path.expanduser("~/.FreeCAD/Mod"),
            os.path.expanduser("~/.local/share/FreeCAD/Mod"),
        ]

    for path in candidates:
        parent = os.path.dirname(path)
        if os.path.isdir(parent):
            return path

    # Fallback: ask the user
    print("Could not auto-detect FreeCAD Mod directory.")
    path = input("Enter the full path to your FreeCAD Mod directory: ").strip()
    return path


def main():
    script_dir  = os.path.dirname(os.path.abspath(__file__))
    src         = os.path.join(script_dir, "PLMWorkbench")
    mod_dir     = find_freecad_mod_dir()
    dest        = os.path.join(mod_dir, "PLMWorkbench")

    if not os.path.isdir(src):
        print(f"ERROR: Source not found: {src}")
        sys.exit(1)

    os.makedirs(mod_dir, exist_ok=True)

    if os.path.exists(dest):
        print(f"Removing existing installation at: {dest}")
        shutil.rmtree(dest)

    shutil.copytree(src, dest)
    print(f"\n✓ PLM Workbench installed to:\n  {dest}")
    print("\nRestart FreeCAD to activate the 'PLM Vault' workbench and toolbar.")
    print("\nFirst-time setup inside FreeCAD:")
    print("  1. Switch to the 'PLM Vault' workbench (or find PLM toolbar in any workbench)")
    print("  2. Click  PLM Settings  and enter:")
    print("       Server URL : http://localhost:5000/api")
    print("       Username   : your ERP login")
    print("       Password   : your ERP password")
    print("  3. Click OK – you are now logged in and ready to use New / Check Out / Check In.")


if __name__ == "__main__":
    main()
