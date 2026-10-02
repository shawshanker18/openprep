; Uninstall also removes the openprep:// link handler the app registers when it runs.
!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\openprep"
!macroend
