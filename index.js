let geojsonObject = 
{
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "coordinates": [
            -75.70030379215137,
            45.415287821780566
          ],
          "type": "Point"
        }
      },
      {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "coordinates": [
            -75.70773060740844,
            45.41012250749017
          ],
          "type": "Point"
        }
      },
      {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "coordinates": [
            -75.6896449369211,
            45.412101795897456
          ],
          "type": "Point"
        }
      },
      {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "coordinates": [
            [
              -75.6986533887607,
              45.40746725557008
            ],
            [
              -75.69624655048328,
              45.41364655816648
            ],
            [
              -75.68710056502746,
              45.41736346921721
            ],
            [
              -75.6921205420071,
              45.419245967192325
            ]
          ],
          "type": "LineString"
        }
      },
      {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "coordinates": [
            [
              [
                -75.71357578490618,
                45.416156702515025
              ],
              [
                -75.71357578490618,
                45.413405187625756
              ],
              [
                -75.70786813984742,
                45.413405187625756
              ],
              [
                -75.70786813984742,
                45.416156702515025
              ],
              [
                -75.71357578490618,
                45.416156702515025
              ]
            ]
          ],
          "type": "Polygon"
        }
      }
    ]
  }
  
let jsonVectorSource = new ol.source.Vector({
    features: new ol.format.GeoJSON().readFeatures(geojsonObject),
  });
  
jsonVectorSource.addFeature(new ol.Feature(new ol.geom.Circle([5e6, 7e6], 1e6)));


const vectorLayer = new ol.layer.Vector({
source: jsonVectorSource
});

const map = new ol.Map({
    layers: [
        new ol.layer.Tile({ source: new ol.source.OSM()}),
        vectorLayer
    ],
    target: 'map',
    view: new ol.View({
        center: [-75.6972, 45.4215],
        zoom: 14,
        projection: "EPSG:4326"
    }),
});

document.getElementById('zoom-out').onclick = function () {
    const view = map.getView();
    const zoom = view.getZoom();
    view.setZoom(zoom - 1);
    let line = turf.lineString([[-83, 30], [-84, 36], [-78, 41]]);
    let options = {units: 'miles'};

    let along = turf.along(line, 200, options);
    console.log(along)
};

document.getElementById('zoom-in').onclick = function () {
const view = map.getView();
const zoom = view.getZoom();
view.setZoom(zoom + 1);

let vectorSourceFeatures = vectorLayer.getSource().getFeatures();
let layerJson = new ol.format.GeoJSON().writeFeaturesObject(vectorSourceFeatures);
};

