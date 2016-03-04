@echo off

:: LESS

call lessc css\bootstrap.less > css\bootstrap.less.css

:: CSS

type css\bootstrap.less.css > css\style.min.css
echo. >> css\style.min.css
..\jsmin < css\style.css >> css\style.min.css

:: Delete the old archive
del package.zip

:: Package the new page
"C:\Program Files (x86)\7-Zip\7z.exe" u -tZip package.zip code.js code.min.js css\style.min.css css\bootstrap.css.map dot.png marker.png fonts