# assets/app.ico

Put the real T-Tech Studio logo here as `app.ico` before building the
final .exe (Step 4) or the installer (Step 6).

For laptop testing before a final logo is ready, any placeholder
.ico file works fine -- Windows just needs *a* file at this path,
it doesn't check what's in it.

You can make a quick placeholder .ico from any square PNG using a
free online converter, or skip --icon entirely in the pyinstaller
command in Step 4 and Windows will use a generic default icon.
