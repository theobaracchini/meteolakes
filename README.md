Meteolakes
--

Web application to visualize the result of a Delft3D simulation of Lake Geneva.

[Demo](http://meteolakes.epfl.ch/)

Installation and Development
--

1. Install [Node.js](https://nodejs.org/).
2. Run `npm install`.
3. Run `npm start`.
4. Browse to [http://localhost:8080/](http://localhost:8080/).


Deployment
--

1. Follow steps 1 and 2 above.
2. Switch to the `release` branch, update version in `package.json` and commit.
3. Create a `git tag` for the new version.
4. Run `git push && git push --tags` to push the new version and tag.
5. Run `npm pack`; This will create a file `lake-view-{version}.tgz`
6. Extract `lake-view-{version}.tgz` on the server.


Technologies and Libraries in this project
--

Name and short description of each product.

- Node.js/npm
  - Package manager; Fetch all other dependencies.
- AngularJS
  - Web application framework; Organize code into modules and update views.
- gulp.js
  - Build tool; Concatenate all .js modules into a single bundle.js file.
- ng-annotate
  - Add AngularJS dependency injection annotations.
- Bootstrap
  - Front-end web framework; Page layout and interactive elements.
- Leaflet
  - Interactive map library.
- Proj4Leaflet
  - Proj4js Leaflet plugin; Transform between EPSG:21781 (CH1903 / LV03) and
    EPSG:3857 (WGS 84 / Pseudo-Mercator).
- Pixi.js
  - 2D webGL renderer with canvas fallback; Draw data on maps.
- rbush/rbush-knn
  - k-nearest neighbors search; Find closest data point when clicking on map.
- jQuery
  - DOM manipulation library.
- D3.js
  - SVG plotting library; Draw time series of simulation data.
- Moment.js
  - Parse, validate, manipulate, and display dates in JavaScript.
- Google Analytics
  - Web analytics service; Tracks and report website traffic.
- srihash.org
  - Soubresource Integrity; Ensure that resources hosted on third-party servers
    have not been tampered with.


Folder structure
--

- `./`
  - `index.html` and favicons
- `./app/js`
  - AngularJS modules
- `./app/vendor`
  - 3rd party libraries
- `./css`
  - Custom CSS styles
- `./dist`
  - `gulp.js` build output
- `./img`
  - images
