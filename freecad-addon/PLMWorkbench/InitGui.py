"""
PLM Workbench – InitGui.py
"""

import sys
import os

import FreeCAD
import FreeCADGui

# Add our folder to sys.path so PLMCommands can be imported
_dir = os.path.join(FreeCAD.getUserAppDataDir(), "Mod", "PLMWorkbench")
if os.path.isdir(_dir) and _dir not in sys.path:
    sys.path.insert(0, _dir)


def _show_login_if_needed():
    """Show PLM Settings dialog on startup if no token is saved."""
    try:
        import FreeCAD
        import FreeCADGui
        import PLMCommands
        token = FreeCAD.ParamGet("User parameter:BaseApp/Preferences/PLM").GetString("Token", "")
        if not token:
            dlg = PLMCommands._SettingsDialog(FreeCADGui.getMainWindow())
            dlg.exec()
    except Exception as e:
        FreeCAD.Console.PrintWarning(f"PLMWorkbench: startup login check failed: {e}\n")


# Schedule the login dialog 2 seconds after FreeCAD finishes loading
try:
    from PySide2.QtCore import QTimer
except ImportError:
    from PySide6.QtCore import QTimer  # type: ignore

QTimer.singleShot(2000, _show_login_if_needed)


class PLMWorkbench(FreeCADGui.Workbench):
    MenuText = "PLM Vault"
    ToolTip  = "Scientific Solutions PLM – vault checkout / checkin"
    Icon     = ""

    def Initialize(self):
        import PLMCommands
        self.Icon = PLMCommands.icon_path("plm_workbench.svg")
        cmds = [
            "PLM_Settings",
            "Separator",
            "PLM_NewItem",
            "PLM_CheckOut",
            "PLM_CheckIn",
            "Separator",
            "PLM_SyncParams",
        ]
        self.appendToolbar("PLM Vault", cmds)
        self.appendMenu("&PLM", cmds)

    def Activated(self):
        import FreeCAD
        import FreeCADGui
        import PLMCommands
        token = FreeCAD.ParamGet("User parameter:BaseApp/Preferences/PLM").GetString("Token", "")
        if not token:
            dlg = PLMCommands._SettingsDialog(FreeCADGui.getMainWindow())
            dlg.exec()

    def Deactivated(self):
        pass

    def GetClassName(self):
        return "Gui::PythonWorkbench"


FreeCADGui.addWorkbench(PLMWorkbench())
