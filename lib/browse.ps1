param([string]$initialDir = "E:\Music Projects")
Add-Type -AssemblyName System.Windows.Forms
$dlg = New-Object System.Windows.Forms.FolderBrowserDialog
$dlg.Description = "Select Album or suno_exports Folder"
if ($initialDir -and (Test-Path $initialDir)) {
    $dlg.SelectedPath = $initialDir
}
$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.Show()
$form.BringToFront()
$res = $dlg.ShowDialog($form)
$form.Close()
$form.Dispose()
if ($res -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dlg.SelectedPath
}
