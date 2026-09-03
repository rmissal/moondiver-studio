param([string]$initialDir = "E:\Music Projects")
Add-Type -AssemblyName System.Windows.Forms

[System.Windows.Forms.Application]::EnableVisualStyles()
$dlg = New-Object System.Windows.Forms.FolderBrowserDialog
$dlg.Description = "Select Folder for Moondiver Mastering"
if ($initialDir -and (Test-Path $initialDir)) {
    $dlg.SelectedPath = $initialDir
}

$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.WindowState = [System.Windows.Forms.FormWindowState]::Minimized
$form.Show()
$form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
$form.Activate()
$form.BringToFront()

$res = $dlg.ShowDialog($form)
$form.Close()
$form.Dispose()

if ($res -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dlg.SelectedPath
}
