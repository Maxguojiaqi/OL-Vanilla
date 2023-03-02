/**
 * Elements that make up the popup.
 */
const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

/**
 * Create an overlay to anchor the popup to the map.
 */
const overlay = new ol.Overlay({
  element: container,
  autoPan: {
    animation: {
      duration: 250,
    },
  },
});

/**
 * Add a click handler to hide the popup.
 * @return {boolean} Don't follow the href.
 */
closer.onclick = function () {
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};

const key = 'Get your own API key at https://www.maptiler.com/cloud/';
const attributions =
  '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';

// draw source
let drawSource = new ol.source.Vector({wrapX: false});
let drawVectorLayer = new ol.layer.Vector({source: drawSource});

const samplePointFeature = new ol.Feature({
  geometry: new ol.geom.Point([-75.42391508789062, 45.41738012695313]),
  name : "CUASSensor",
  type : "Sensor",
  orientation: 50
});
// const sampleLineFeature = new ol.Feature({
//   geometry: new ol.geom.LineString([[-75.4239, 45.4173],[[-75.4233, 45.4172]]])
// }); 
drawSource.addFeature(samplePointFeature)
// samplePointFeature.setProperties({
// name : "CUASSensor",
// type : "Sensor"
// })

const map = new ol.Map({
    layers: [
        new ol.layer.Tile({source: new ol.source.OSM()}),
        drawVectorLayer
    ],
    overlays: [overlay],
    target: 'map',
    view: new ol.View({
        projection : "EPSG:4326",
        center: [-75.6972, 45.4215],
        zoom: 10,
    }),
});

const modify = new ol.interaction.Modify({source: drawSource});
map.addInteraction(modify);
modify.on("modifyend", (evt)=>{
  overlay.setPosition(undefined);
})

map.on('click', async (evt) => {
    const coordinate = evt.coordinate;
    let mapFeatures = await drawVectorLayer.getFeatures(evt.pixel);
    if (mapFeatures.length != 0) {
      content.innerHTML = `<ul><li>Feature Type: <input type="text" id="featureType" value=${mapFeatures[0].getProperties().type}></li><li>Feature Name: <input type="text" id="featureName" value=${mapFeatures[0].getProperties().name}></li><li>Feature Orientation: <input type="text" id="featureOrientation" value=${mapFeatures[0].getProperties().orientation}></li></ul><button id="updateFeatureBtn">Update Feature</button><button id="removeFeatureBtn">Remove Feature</button>`;
      overlay.setPosition(coordinate);
      let removeFeature = ()=>{
        drawSource.removeFeature(mapFeatures[0]);
        overlay.setPosition(undefined);
      }
      let updateFeature = ()=>{
        mapFeatures[0].setProperties({
          name : document.getElementById("featureName").value,
          type : document.getElementById("featureType").value,
          orientation : document.getElementById("featureOrientation").value,
        })
        overlay.setPosition(undefined);
      }
      document.getElementById("updateFeatureBtn").addEventListener("click", updateFeature);
      document.getElementById("removeFeatureBtn").addEventListener("click", removeFeature);
    }
    else {
      let addPointFeature = ()=>{
        const pointFeature = new ol.Feature({
            geometry: new ol.geom.Point(coordinate),
            name: document.getElementById("newFeatureName").value,
            type: document.getElementById("newFeatureType").value,
            orientation : document.getElementById("newFeatureOrientation").value,
        });
        drawSource.addFeature(pointFeature);
        overlay.setPosition(undefined);
      }

      content.innerHTML = '<p>Add new feature:</p><label>Feature Name: </label><input type="text" id="newFeatureName"><br><label>Feature Type: </label><input type="text" id="newFeatureType"><br><label>Orientation: </label><input type="text" id="newFeatureOrientation"><br><button id="addPointBtn">Add Point Asset</button>';
      overlay.setPosition(coordinate);
    
      document.getElementById("addPointBtn").addEventListener("click", addPointFeature);
    }
});
