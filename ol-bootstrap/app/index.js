class OpenSideBarControl extends ol.control.Control {
  /**
   * @param {Object} [opt_options] Control options.
   */
  constructor(opt_options) {
    const options = opt_options || {};
    const button = document.createElement('button');
    const element = document.createElement('div');
    element.className = 'edit-widget ol-unselectable';
    element.appendChild(button);
    super({
      element: element,
      target: options.target,
    });

    button.innerHTML = 'Add New Observation';
    button.addEventListener('click', () => {
      document.getElementById("addFeatureDrawer").style.width = "250px";
    });
    document.getElementById("closeAddDrawer").addEventListener("click", ()=>{document.getElementById("addFeatureDrawer").style.width = "0";} );

    document.getElementById("addObservationBtn").addEventListener("click", ()=>{
      let pointDraw = new ol.interaction.Draw({
          source: observationSource,
          stopClick: true,
          type: "Point"
        });
      map.addInteraction(pointDraw);
      pointDraw.on('drawend', (evt) => {
        map.removeInteraction(pointDraw)
        evt.feature.setProperties({
          name: document.getElementById("newFeatureName").value,
          type: document.getElementById("newFeatureType").value,
          mediaPath : document.getElementById("newObervationMedia").value,
        })
      })
    });

    document.getElementById("findNumberOfObservations").addEventListener("click", ()=>{
      let polygonDraw = new ol.interaction.Draw({
          // source: drawSelectSource,
          stopClick: true,
          type: "Polygon"
        });
      map.addInteraction(polygonDraw);
      polygonDraw.on('drawend', (evt) => {
        let polygonRegionGeometry = evt.feature.getGeometry();
        let observationFeatures = observationSource.getFeatures();
        let selectedObservationFeatures = [];
        observationFeatures.forEach((observationFeature)=>{
          let observationFeatureGeometry = observationFeature.getGeometry();
          if(polygonRegionGeometry.intersectsCoordinate(observationFeatureGeometry.getCoordinates())){
            selectedObservationFeatures.push(observationFeature);
          }
        })
        // drawSelectSource.removeFeature(evt.feature);
        // drawSelectSource.refresh();
        map.removeInteraction(polygonDraw);
      })
    });

  }
}



document.getElementById("addFeatureDrawerContent").innerHTML = `<label>Observation Name: </label><input type="text" id="newFeatureName"><br>
                                                            <label>Observation Type: </label><br>
                                                            <select id="newFeatureType">
                                                              <option value="UAS">UAS</option>
                                                              <option value="GCS">GCS</option>
                                                              <option value="CUAS">CUAS</option>
                                                            </select><br>
                                                            <label>Observation Media: </label><input type="file" id="newObervationMedia"><br><br>
                                                            <button id="addObservationBtn">Add Observation</button>
                                                            <button id="findNumberOfObservations">Find Number of observation within region</button>`;


// hospital source and layer

let hospitalJson = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.66829356321553,
          45.39596363499578
        ],
        "type": "Point"
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.6487879258227,
          45.4014110115379
        ],
        "type": "Point"
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.6359319375423,
          45.40358981510846
        ],
        "type": "Point"
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.72126906529505,
          45.39253930637295
        ],
        "type": "Point"
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.7308002290209,
          45.38864776580928
        ],
        "type": "Point"
      }
    }
  ]
}

let hospitalJsonVectorSource = new ol.source.Vector({
  features: new ol.format.GeoJSON().readFeatures(hospitalJson),
  projection: "EPSG:4326"
});

const hospitalJsonVectorLayer = new ol.layer.Vector({
  source: hospitalJsonVectorSource
});



// hardware store source and layer

let hardwareStoreJson = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.60981607683134,
          45.41726898875109
        ],
        "type": "Point"
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.66071467015202,
          45.364353967026545
        ],
        "type": "Point"
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.7583210558081,
          45.3525677605077
        ],
        "type": "Point"
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.91726926431585,
          45.302009357420445
        ],
        "type": "Point"
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.71304692211976,
          45.37453696716355
        ],
        "type": "Point"
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.66788251408691,
          45.28037085525892
        ],
        "type": "Point"
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.6703148573255,
          45.38166537346288
        ],
        "type": "Point"
      }
    }
  ]
}
let hardwareJsonVectorSource = new ol.source.Vector({
  features: new ol.format.GeoJSON().readFeatures(hardwareStoreJson),
  projection: "EPSG:4326"
});

const hardwareJsonVectorLayer = new ol.layer.Vector({
  source: hardwareJsonVectorSource
});

// ottawa data source and layer
const url = 'https://maps.ottawa.ca/arcgis/rest/services/Zoning/MapServer';
let ottawaTileLayer = new ol.layer.Tile({source:new ol.source.TileArcGISRest({url: url})});

// observation source and layer
let observationSource = new ol.source.Vector({wrapX: false});
let observationLayer = new ol.layer.Vector({source: observationSource});

// select source and layer
let drawSelectSource = new ol.source.Vector({wrapX: false});
let drawSelectLayer = new ol.layer.Vector({source: drawSelectSource});

const map = new ol.Map({
    layers: [
        new ol.layer.Tile({ source: new ol.source.OSM()}),
        // ottawaTileLayer,
        observationLayer,
        drawSelectLayer
    ],
    target: 'map',
    view: new ol.View({
        center: [-75.6972, 45.4215],
        zoom: 14,
        projection: "EPSG:4326"
    }),
});


map.addControl(new OpenSideBarControl);
const observationModify = new ol.interaction.Modify({source: observationSource});
map.addInteraction(observationModify);
observationModify.on("modifyend", (evt)=>{
  // some modify events
})

map.on('click', async (evt) => {
    let mapFeatures = await observationLayer.getFeatures(evt.pixel);
    if (mapFeatures.length != 0) {
      document.getElementById("editDrawer").style.width = "250px";
      document.getElementById("closeEditDrawer").addEventListener("click", ()=>{document.getElementById("editDrawer").style.width = "0";} );
      document.getElementById("editDrawerContent").innerHTML = `<ul id="currentObservation">
                                                                  <li>Observation Name:</li>
                                                                  <label>${mapFeatures[0].getProperties().name}</label>
                                                                  <li>Observation Type:</li>
                                                                  <label>${mapFeatures[0].getProperties().type}</label>
                                                                  <li>Observation Media: </li>
                                                                  <label>${mapFeatures[0].getProperties().mediaPath.split("\\")[2]}</label>
                                                                </ul>
                                                                <ul id="editObservation" hidden>
                                                                  <li>Observation Type: <input type="text" id="observationType" ></li>
                                                                  <li>Observation Name: <input type="text" id="observationName"></li>
                                                                  <li>Observation Media: <input type="file" id="observationFile"></li>
                                                                </ul>
                                                                <div id="editButtons">
                                                                  <button id="enableEditButton">Enable Edit</button>
                                                                  <button id="disableEditButton" hidden>Disable Edit</button>
                                                                  <button id="updateFeatureBtn" hidden>Apply Edit</button>
                                                                </div>
                                                                <div>
                                                                  <button id="findHospital">Find Hospital within 3 km</button>
                                                                  <button id="findHardwareStore">Find Hardware Store within 3km</button>
                                                                </div>`;
      document.getElementById("findHospital").addEventListener("click", ()=>{
        let currentObservationBuffer = ol.extent.buffer(mapFeatures[0].getGeometry().getExtent(), 0.03); 
        let observationBufferGeometry = new ol.geom.Polygon.fromExtent(currentObservationBuffer);
        let hospitalFeatures = jsonVectorSource.getFeatures();
        let hospitalFeaturesWithin3km = [];
        hospitalFeatures.forEach(hospitalFeature => {
          if (observationBufferGeometry.intersectsCoordinate(hospitalFeature.getGeometry().getCoordinates())) {
      
            // add the intersecting feature to the array
            hospitalFeaturesWithin3km.push(hospitalFeature);
          }
        });
      });

      document.getElementById("findHardwareStore").addEventListener("click", ()=>{
        let currentObservationBuffer = ol.extent.buffer(mapFeatures[0].getGeometry().getExtent(), 0.03); 
        let observationBufferGeometry = new ol.geom.Polygon.fromExtent(currentObservationBuffer);
        let hardwareStoreFeatures = jsonVectorSource.getFeatures();
        let hardwareFeautresWithin3km = [];
        hardwareStoreFeatures.forEach(hospitalFeature => {
          if (observationBufferGeometry.intersectsCoordinate(hospitalFeature.getGeometry().getCoordinates())) {
      
            // add the intersecting feature to the array
            hardwareFeautresWithin3km.push(hospitalFeature);
          }
        });
      });
      document.getElementById("updateFeatureBtn").addEventListener("click", ()=>{
        mapFeatures[0].setProperties({
          name : document.getElementById("featureName").value,
          type : document.getElementById("featureType").value,
          orientation : document.getElementById("featureOrientation").value,
        })
      });
      document.getElementById("enableEditButton").addEventListener("click", ()=>{
        document.getElementById("currentObservation").hidden = true;
        document.getElementById("enableEditButton").hidden = true;
        document.getElementById("disableEditButton").hidden = false;
        document.getElementById("editObservation").hidden = false;
        document.getElementById("updateFeatureBtn").hidden = false;
      });
      document.getElementById("disableEditButton").addEventListener("click", ()=>{
        document.getElementById("enableEditButton").hidden = false;
        document.getElementById("currentObservation").hidden = false;
        document.getElementById("disableEditButton").hidden = true;
        document.getElementById("editObservation").hidden = true;
        document.getElementById("updateFeatureBtn").hidden = true;
      });
    }
});

