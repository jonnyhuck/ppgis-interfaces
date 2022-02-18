

/**
 * JavaScript implementation of Huck and Gullick's Bresenham Viewshed Algorithm
 */

 //transformer object
 var transformer = proj4("+proj=longlat +datum=WGS84 +no_defs", data.proj);


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
	return [ latLng[0], latLng[1] ];	// this needed re-reversing compared to the astar one... go figure...!?!
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
 * Simple Pythagorean distance calculation
 */
function distance(x1, y1, x2, y2) {
	return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

/**
 * Work out the length of a metre in pixels
 */
function metre2pixel(){
	return 40075016.686 * Math.abs(Math.cos(map.getCenter().lat * Math.PI/180)) / Math.pow(2, map.getZoom() + 8);
}

/**
 * Runs a single ray-trace from one point to another point,
 *	set output data to 1 for each visible cell
 */
function lineOfSight(x1, y1, x2, y2, observerHeight, targetHeight) {

	// init variables
	let deltax = Math.abs(x2 - x1);
	let deltay = Math.abs(y2 - y1);
	let count = 0; 				//this is how many pixels we are in to our ray.
	let initialHeight = 0;  	//getHeightAt(fx,fy);
	let biggestDYDXSoFar = 0; 	//biggest peak so far
	let currentDYDX = 0; 		//current peak
	let tempHeight = 0; 		//temp height used for offset comparisons.
	let distanceTravelled = 0;
	let x = x1;         		// Start x off at the first pixel
	let y = y1;         		// Start y off at the first pixel
	let xinc1, xinc2, yinc1, yinc2, curpixel, den, num, numadd, numpixels, pxLoc, h;
	let ray = [];

	// get the direction on x axis
	if (x2 >= x1) {      // The x-values are increasing
		xinc1 = data['resolution'];
		xinc2 = data['resolution'];
	} else {             // The x-values are decreasing
		xinc1 = -data['resolution'];
		xinc2 = -data['resolution'];
	}

	// get the direction on y axis
	if (y2 >= y1){       // The y-values are increasing
		yinc1 = data['resolution'];
		yinc2 = data['resolution'];
	}
	else{             	 // The y-values are decreasing
		yinc1 = -data['resolution'];
		yinc2 = -data['resolution'];
	}

	 // There is at least one x-value for every y-value
	if (deltax >= deltay){
		xinc1 = 0;
		yinc2 = 0;
		den = deltax;
		num = deltax / 2;
		numadd = deltay;
		numpixels = deltax;

	// There is at least one y-value for every x-value
	} else {
		xinc2 = 0;
		yinc1 = 0;
		den = deltay;
		num = deltay / 2;
		numadd = deltax;
		numpixels = deltay;
	}

	// loop along the line in increments of resolution
	for (let curpixel = 0; curpixel <= numpixels; curpixel += data['resolution']){

		// pixel location for end point
		pxLoc = osgb2image([x, y]);
		x1pixel = pxLoc[0];
		y1pixel = pxLoc[1];

		// distance travelled so far
		distanceTravelled = distance(x1, y1, x, y);

    // console.log(x1pixel, y1pixel);

    //get current elevation (replace with 0 if goes off the edge)
    try {
      h = data.data[x1pixel][y1pixel];
    } catch {
      h = 0;
    }

		// if we are on the first pixel (center of the circle)
		if (count == 0) {

			// set the initial height
			initialHeight = h + observerHeight;

			// we of course can see ourselves
			ray.push([x1pixel, y1pixel]);

		// we are on the second pixel
		} else if (count == 1) {

      // first step definitely visible, just record the DY/DX and move on
      biggestDYDXSoFar = (h - initialHeight) / distanceTravelled;

			// again, obviously visible
			ray.push([x1pixel, y1pixel]);

		// we are past the second pixel
		} else {

      // the height of the top of the object in the landscape
  		tempHeight = (h - initialHeight + targetHeight) / distanceTravelled;

  		//the height of the base of the object in the landscape
  		currentDYDX = (h - initialHeight) / distanceTravelled;

			//is the angle bigger than we have seen?
			if ((tempHeight - biggestDYDXSoFar) >= 0) {
				ray.push([x1pixel, y1pixel]);
			}

			//if this angle is greater than the biggest we have seen before, remember it.
			if (currentDYDX >= biggestDYDXSoFar) {
				biggestDYDXSoFar = currentDYDX;
			}
		}

		//increment ourselves along the line
		count++;

		//update iterators
		num += numadd;      // Increase the numerator by the top of the fraction
		if (num >= den){    // Check if numerator >= denominator
			num -= den;     // Calculate the new numerator value
			x += xinc1;     // Change the x as appropriate
			y += yinc1;     // Change the y as appropriate
		}
		x += xinc2;       	// Change the x as appropriate
		y += yinc2;       	// Change the y as appropriate
	}

	//return the points on  the line of sight that were visible
	return ray;
}


/**
 * Use Bresenham's Circle / Midpoint algorithm to determine endpoints for viewshed
 */
function viewshed(x0, y0, radius, observerHeight, targetHeight) {

  // initialise variables
  let x = radius - data['resolution'];
  let y = 0;
  let dx = data['resolution'];
  let dy = data['resolution'];
  let err = dx - (radius << 1);
  let one, two, three, four, five, siz, seven, eight;
  let out = [];

  // verify that we are on the dataset
  try {
    let tmp1 = osgb2image([x0, y0]);
    let tmp2 = data.data[tmp1[0]][tmp1[1]];
  } catch {
    alert("Please click on the island!");
    return [];
  }

  // loop around each octant arc
  while (x >= y) {

    // calculate one ray in each octant
    out = out.concat(
    	lineOfSight(x0, y0, x0 + x, y0 + y, observerHeight, targetHeight),
    	lineOfSight(x0, y0, x0 + y, y0 + x, observerHeight, targetHeight),
    	lineOfSight(x0, y0, x0 - y, y0 + x, observerHeight, targetHeight),
    	lineOfSight(x0, y0, x0 - x, y0 + y, observerHeight, targetHeight),
    	lineOfSight(x0, y0, x0 - x, y0 - y, observerHeight, targetHeight),
    	lineOfSight(x0, y0, x0 - y, y0 - x, observerHeight, targetHeight),
    	lineOfSight(x0, y0, x0 + y, y0 - x, observerHeight, targetHeight),
    	lineOfSight(x0, y0, x0 + x, y0 - y, observerHeight, targetHeight)
    );

    // adjust for error
    if (err <= 0){
      y += data['resolution'];
      err += dy;
      dy += (2 * data['resolution']);
    } else {
      x -= data['resolution'];
      dx += (2 * data['resolution']);
      err += dx - (radius << 1);
    }
  }

  //compile results and return
  return out;
}


/**
 * Test all of the transformation functions
 */
function TEST_transforms2(tmp0) {
	console.log(tmp0);
	var tmp = wgs842osgb(tmp0)
	console.log(tmp);
	var tmp2 = osgb2image(tmp);
	console.log(tmp2);
	var tmp3 = image2osgb(tmp2);
	console.log(tmp3);
	console.log(osgb2wgs84(tmp3));
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
