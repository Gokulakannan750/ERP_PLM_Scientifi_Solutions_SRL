# PLM Vault – FreeCAD Add-on

A FreeCAD workbench that connects directly to the Scientific Solutions ERP/PLM server.  
Works the same way as the Creo + Windchill integration: open FreeCAD, click **New PLM Item** or **Check Out**, design, then **Check In** to push the file back to the vault.

---

## Installation

### Option A – automatic (recommended)

```bash
# From this directory (freecad-addon/)
python install.py
```

Restart FreeCAD. Done.

### Option B – manual

Copy the `PLMWorkbench/` folder into your FreeCAD user Mod directory:

| OS      | Path |
|---------|------|
| Windows | `%APPDATA%\FreeCAD\Mod\PLMWorkbench` |
| macOS   | `~/Library/Preferences/FreeCAD/Mod/PLMWorkbench` |
| Linux   | `~/.FreeCAD/Mod/PLMWorkbench` |

Restart FreeCAD.

---

## First-time setup

1. Switch to the **PLM Vault** workbench (or find the PLM toolbar in any workbench).
2. Click **PLM Settings** (gear icon).
3. Enter:
   - **Server URL**: `http://localhost:5000/api`  
     *(change to your server IP if FreeCAD runs on a different machine)*
   - **Username / Password**: your ERP login
   - **Checkout directory**: local folder where vault files are downloaded (default: `~/PLM_Checkout`)
4. Click **OK** – the token is saved in FreeCAD preferences.

---

## Toolbar buttons

| Button | What it does |
|--------|-------------|
| **PLM Settings** | Set server URL, login credentials, checkout directory |
| **New PLM Item** | Create a new PLM item (gets a part number from the server), then open a blank FreeCAD document linked to it |
| **Check Out** | Browse PLM items → lock the chosen item → download the vault file → open it in FreeCAD |
| **Check In** | Save the active document → upload it to the PLM vault → release the lock |
| **Sync Params** | Read the `ERP_Params` spreadsheet in the active document and push all key/value pairs to the PLM item's custom fields |

---

## Typical workflow

```
1. Click New PLM Item
       → enter name "Bracket_v1", type "Part"
       → PLM creates item P00042A, opens a new FreeCAD document

2. Design the part in FreeCAD

3. Click Check In
       → file is saved and uploaded as P00042A_v1.FCStd
       → vault version = 1

4. Later, from another machine:
       Click Check Out → select P00042A
       → downloads P00042A_v1.FCStd, opens it

5. Make changes, click Check In
       → vault version = 2, old file deleted from vault
```

---

## Requirements

- FreeCAD 0.20 or newer (PySide2 bundled)
- `requests` Python package available to FreeCAD's interpreter:
  ```bash
  # Windows (run as Administrator in FreeCAD's Python)
  pip install requests
  # or place requests/ in %APPDATA%\FreeCAD\Mod\PLMWorkbench\
  ```
- ERP/PLM server running (`npm start` in `server/`)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Toolbar not visible | Switch to **PLM Vault** workbench first; then drag toolbar from View → Toolbars |
| "requests not found" | `pip install requests` in FreeCAD's Python (see Requirements) |
| "Could not create PLM item" | Check server is running and token is valid (re-run PLM Settings) |
| File opens but shows empty | Check the `.FCStd` file in `~/PLM_Checkout` – if 0 bytes, the vault file was never uploaded |
