@echo off

:: LESS

call lessc css\bootstrap.less > css\bootstrap.less.css

:: CSS

type css\bootstrap.less.css > style.min.css
echo. >> style.min.css
..\jsmin < css\style.css >> style.min.css

:: JS

type globals.js > code.js
echo. >> code.js
type models\dateplusplus.js >> code.js
echo. >> code.js
type models\temporalData.js >> code.js
echo. >> code.js
type models\chart.js >> code.js
echo. >> code.js
type models\Particle.js >> code.js
echo. >> code.js
type models\ParticleEmitter.js >> code.js
echo. >> code.js
type app.js >> code.js
echo. >> code.js
type temperatureCtrl.js >> code.js
echo. >> code.js
type velocityCtrl.js >> code.js
echo. >> code.js
type timeCtrl.js >> code.js
echo. >> code.js

..\jsmin < code.js > code.min.js


:: Delete the old archive
del package.zip

:: Package the new page
"C:\Program Files (x86)\7-Zip\7z.exe" u -tZip package.zip code.min.js style.min.css dot.png marker.png fonts