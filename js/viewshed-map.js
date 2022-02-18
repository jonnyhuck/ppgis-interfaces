// Load global variables
let map, topo, satellite, canvas, vs = [], dataPoints = [], clickPoints = [];

/**
 * Initialise the Map
 */
function initMap() {

  // this defines the basemap tiles that will be added to the map
  topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 15,
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
  });
  satellite = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 15,
    attribution: '&copy; <a href="http://www.esri.com/">Esri</a> i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  });

  // this is the canvas object to which we will draw the viewshed
  canvas = L.TileLayer.maskCanvas({
         radius: data.resolution,
         useAbsoluteRadius: true,
         color: '#f00',
         opacity: 0.6,
         noMask: true,
  });

  // this is a variable that holds the reference to the Leaflet map object
  map = L.map('map', {
    center: [56.98094722327509,-7.493614270972837], //lat lng
    zoom: 12,
    layers:[topo]
  });

  // add the info box containing the layer toggle
  addInfoBox()

  // add listener for click event on the map
  map.on('click', function(e){

    // calculate & plot viewshed
    vs = calculateViewshed([e.latlng.lng, e.latlng.lat]);
    plotViewshed(vs);
  });
}

/**
 * Create the info box in the top right corner of the map
 */
function addInfoBox(){

  // create a Leaflet control (generic term for anything you add to the map)
  const info = L.control();

  //create the info box to update with population figures on hover
  info.onAdd = function (map) {

    // create the div
    this._div = L.DomUtil.create('div', 'info');

    // populate it with HTML
    this._div.innerHTML =
    '<span id="buttonPanel">\
      <button onclick="saveToDb();">Save Map</button>\
      <button onclick="undo();">Undo</button>\
      <button onclick="clearMap();">Clear Map</button>\
    </span>\
    <span id="toggle_container">\
      <label for="satelliteToggle">\
        <span id="toggletext">Satellite Image</span>\
      </label>\
      <label class="switch">\
        <input id="satelliteToggle" type="checkbox" onclick="toggleLayers()">\
          <span class="slider round">\
          </span>\
      </label>\
    </span>';

    // prevent clicks on the div from being propagated to the map
    L.DomEvent.disableClickPropagation(this._div);

    //return the div
    return this._div;
  };

  // add the info window to the map
  info.addTo(map);
}

/**
 * Switch between topo and satellite basemap
 */
function toggleLayers() {

  //if it has been checked, add the satellite layer
  if (document.getElementById("satelliteToggle").checked) {

    // add satellite and remove topo
    map.addLayer(satellite);
    map.removeLayer(topo);

  } else {	//if unchecked, add topo

    // add topo and remove satellite
    map.addLayer(topo);
    map.removeLayer(satellite);
  }
}

/**
 * Calculate a Viewshed
 */
function calculateViewshed(clickLoc){

    // get & store click point and viewshed
    let clickPoint = wgs842osgb(clickLoc);
    clickPoints.push(clickPoint);
    return viewshed(clickPoint[0], clickPoint[1], 5000, 2, 50);
}

/**
 * Plot a Viewshed using maskcanvas
 */
function plotViewshed(vs){

  // only if a valid viewshed has been returned
  if (vs.length > 0) {

    // push empty array into dataPoints
    dataPoints.push([]);

    // load viewshed data points into array
    let coord;
    let points = [];
    let j = dataPoints.length-1;
    for (let i = 0; i < vs.length; i++){
      coord = osgb2wgs84(image2osgb(vs[i]));
      dataPoints[j].push([coord[1], coord[0]]);
    }

    // add point to layer, layer to map
    canvas.setData(dataPoints.flat());
    map.addLayer(canvas);
  }
}

/**
 * Undo last viewshed
 */
function undo(){

  // remove last viewshed
  dataPoints.pop();
  clickPoints.pop();

  // remove canvas, update with all but the last viewshed, re-add
  canvas.setData(dataPoints.flat());
  map.addLayer(canvas);
}

/**
 * Clear all viewsheds from the map
 */
function clearMap(){

  //remove previous dataPoints
  dataPoints = [];
  clickPoints = [];

  //remove data from the canvas
  canvas.setData([]);

  //remove the canvas from the map
  map.removeLayer(canvas);
}
