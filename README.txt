TECHNOLOGIES
*******************************************************************************

Dans l'ordre d'apprentissage:
HTML, Javascript, AngularJS, bootstrap, pixiJS, LESS

The page is located at http://aphys.epfl.ch/page-118054.html

DEPlOYMENT STEPS
*******************************************************************************

There are two different ways to update the page, depending on what changed.
If the javascript code has changed (e.g. a controller changed), proceed with
"Deployment steps (js)".
If the page markup has changed (html), proceed with "Deployment steps (html)".

Deployment steps (js):

1. Run less_minify_and_pack.bat
2. Go to http://aphys.epfl.ch/page-118054.html
3. Login (bottom right)
4. Enter Preview mode
5. Open the File Manager
6. Browse to aphys/MeteoLac
7. Click "upload"
8. Browse to the "package.zip" file create in step 1
9. Tick "automatically unzip"
10. Click ok and close the file manager
11. Refresh the page

Deployment steps (html):

1. Go to http://aphys.epfl.ch/page-118054.html
2. Login (bottom right)
3. Enter Edit mode
4. Click the "update" button on the box with the page content
5. Click the "source" button to edit the markup directly
6. Replace the source with the content of the index_container.html file
7. Validate, then close
8. Refresh the page

DIRECTORY STRUCTURE
*******************************************************************************

./
	Main code and packaged code
./css
	Stylesheets: modified bootstrap and custom style.css for the page
./fonts
	Fonts used by bootstrap
./js
	3rd party libraries
./models
	Classes used by the controllers

CODE STRUCTURE
*******************************************************************************

index.html:
	Main page markup. Use it 