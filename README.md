# PPGIS Interfaces
PPGIS Interfaces associated with the "Informed Interfaces" project - [Denwood et al. (2022)](https://onlinelibrary.wiley.com/doi/pdf/10.1111/tgis.12888).

This repository currently includes two alternative PPGIS interfaces for Leaflet:

* `astar.html`: an interface for calculating **least cost paths** across a terrain surface (e.g., a DEM). This was used to help people to design sensible footpaths on the Isle of Barra - it prevents paths from going through lakes, into the sea, off cliffs etc (by masking those areas in the underlying elevation data) as well as helping create realistic routes through the terrain. This is based on the excellent [javascript-astar](https://github.com/bgrins/javascript-astar) library by [bgrins](https://github.com/bgrins) - here I have simply made the algorithm wirk in a spatial context.
* `viewshed.html`: an interfacefor calculating **viewsheds** on a terrain surface (e.g., a DEM). This was used to help people identify areas from which they would not wish to see a new wind turbine (so if they click on a location, they can see the areas that this would rule out from development). This is largely a JavaScript port of my C++ [Viewshed](https://github.com/jonnyhuck/Viewshed) library.

Both rely on raster data from [OS OpenData](https://osdatahub.os.uk/downloads/open) in the format produced using my [raster-js](https://github.com/jonnyhuck/raster-js) project.

---

For convenience, it also includes local copies of code from:

* [javascript-astar](https://github.com/bgrins/javascript-astar) ([MIT License](https://github.com/bgrins/javascript-astar/blob/master/LICENSE))
* [leaflet-maskcanvas](https://github.com/domoritz/leaflet-maskcanvas) ([MIT License](https://github.com/domoritz/leaflet-maskcanvas/blob/master/LICENSE))
* [proj4js](https://github.com/proj4js/proj4js) ([Custom License](https://github.com/proj4js/proj4js/blob/master/LICENSE.md))

All are re-distributed according to their original licenses (as linked above).

The repository also contains derived data from OS data © Crown copyright and database right 2022.It is included her in accordance with the [Open Government License](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).

