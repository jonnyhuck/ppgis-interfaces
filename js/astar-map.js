// Load global variables
let map, topo, satellite, points=[], transformer, graph, markers=[], geojson,
	routeCollection, oldPaths, oldRouteCollection, oldGeojson;

/**
 * Initialise the Map
 */
function initMap() {

	// set transform between wgs84 and the projection of the dataset
	wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
	transformer = proj4(wgs84, data.proj);

	// build the graph for the astar library
	graph = new Graph(data.data);

	// this adds the basemap tiles to the map
	topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
		maxZoom: 15,
		attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
	});
	satellite = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
		maxZoom: 15,
		attribution: '&copy; <a href="http://www.esri.com/">Esri</a> i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
	});

	// this is a variable that holds the reference to the Leaflet map object
	map = L.map('map', {
		center: [56.98094722327509,-7.493614270972837], //lat lng
		zoom: 12,
		layers:[topo]
	});

	// disable double click zoom on the map
	map.doubleClickZoom.disable();

	//add the info box containing the layer toggle
	addInfoBox();

	// add listener for click event on the map
	map.on('click', onMapClick);
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
			<button onclick="saveToDb();">Save Path</button>\
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
 * Event handler for map click
 */
function onMapClick(e) {

	//make the flag false so this code cannot run a second time
	flag = false;

	// make sure that the click is somewhere that we can go
	var a = wgs842image([e.latlng.lng, e.latlng.lat]);

	if (data.data[a[0]][a[1]]) {

		// snap the location to the dataset
		var snap = image2wgs84(wgs842image([e.latlng.lng, e.latlng.lat]));

		//add marker
		markers.push(L.marker(snap).addTo(map));	//!!!! lat lng

		//store the point
		points.push(snap.reverse());

		// calculate the route between all of the points
		try {
			getRoute();

		//if route can't be found (for last leg) then undo
		} catch (e) {

			//apologise
			alert("Sorry, I couldn't find a route...");

			//undo the move
			undo();
		}

	} else {
		alert("Sorry, I can't go there");
	}
}


/**
 * Get the route between all of the points in the points array
 */
function getRoute() {

	// remove the route from the map if already there
	if (geojson) map.removeLayer(geojson);

	//need at least two points
	if (points.length > 1) {

		// get new route between all points
		for (var i=0, route = []; i < points.length-1; i++) {
			route.push(getPath(points[i], points[i+1]));
		}

		// convert the resulting route array into a feature collection
		routeCollection = turf.featureCollection(route);

		// convert to leaflet GeoJSON object and add to the map
		geojson = L.geoJson(routeCollection, {
			style: {
				color: 'red',
				weight: 7,
				opacity: .7
			}
		}).addTo(map);
	}
}


/**
 * Get the path between two points as turf linestring
 */
function getPath(p1, p2) {

	//define a route between p1 and p2
	var startPoint = wgs842image(p1);
	var endPoint = wgs842image(p2);

	//get grid location
	var start = graph.grid[startPoint[0]][startPoint[1]];
	var end = graph.grid[endPoint[0]][endPoint[1]];

	//get the result
	var result = astar.search(graph, start, end);

	//check that it worked, I edited astar.js so that it returns this on fail
	if (result.length === 1) {

		//stop trying to do a path
		throw "No Route Exception";

	} else {

		//convert from image space to wgs84 coordinates and return
		var path = [p1];	// init array with start location
		for (var i = 0; i < result.length; i++) {
			path.push(image2wgs84([result[i].x, result[i].y]).reverse());
		}

		//add route
		return turf.lineString(path);
	}
}


/**
 * convert osgb to image coordinates
 */
function osgb2image(coord) {
	return [
		parseInt((coord[0] - data.bl[0]) / data.resolution),
		(data.getHeight() - parseInt((coord[1] - data.bl[1]) / data.resolution)) - 1
	];
}


/**
 * convert image coordinates to osgb
 */
function image2osgb(px) {
	return [
		data.bl[0] + (px[0] * data.resolution),
		data.bl[1] + ((data.getHeight() - px[1]) * data.resolution)
	];
}


/**
 * transform osgb coords to wgs84
 */
function osgb2wgs84(osgb) {
	var latLng = transformer.inverse(osgb);
	return [ latLng[1], latLng[0] ];
}


/**
 * transform wgs84 coords to osgb
 */
function wgs842osgb(lngLat) {
	return transformer.forward([lngLat[0], lngLat[1]]);
}


/**
 * convenience function to convert from image coordinates to wgs84
 */
function image2wgs84(px) {
	return osgb2wgs84(image2osgb(px));
}


/**
 * convenience function to convert from wgs84 to image coordinates
 */
function wgs842image(lngLat) {
	return osgb2image(wgs842osgb(lngLat));
}


/**
 * Clear everything from the map
 */
function clearMap() {

	// reset map and globals
	if (geojson) map.removeLayer(geojson);
	for (var m  = 0; m < markers.length; m++) {
		map.removeLayer(markers[m]);
	}
	markers = [];
	points = [];
	route = null;
	geojson = null;
}


/**
 * Undo the last click
 */
function undo() {

	// is there anything to undo?
	if (markers.length > 1){

		// remove the last point from the points array
		points.pop();

		//remove marker
		map.removeLayer(markers.pop());

		// recalculate the route
		getRoute();

	} else if (markers.length === 1) {

		// remove the last point from the points array
		points.pop();

		// just remove the one remaining marker
		map.removeLayer(markers.pop());

	} else {

		//in form user nothing to undo
		alert("Nothing to undo!")
	}
}


/**
 * Test all of the transformation functions
 */
function TEST_transforms(tmp0) {
	console.log(tmp0);
	var tmp = image2osgb(tmp0)
	console.log(tmp);
	var tmp2 = osgb2wgs84(tmp);
	console.log(tmp2);
	var tmp3 = wgs842osgb(tmp2);
	console.log(tmp3);
	console.log(osgb2image(tmp3));
}
