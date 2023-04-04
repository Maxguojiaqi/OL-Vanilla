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

    let addPointDraw = ()=>{
      let pointDraw = new ol.interaction.Draw({
          source: drawSource,
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
    }

    document.getElementById("addPointBtn").addEventListener("click", addPointDraw);

  }
}

document.getElementById("addFeatureDrawerContent").innerHTML = `<p>Add new Observation:</p>
                                                            <label>Observation Name: </label><input type="text" id="newFeatureName"><br>
                                                            <label>Observation Type: </label><br>
                                                            <select id="newFeatureType">
                                                              <option value="UAS">UAS</option>
                                                              <option value="GCS">GCS</option>
                                                              <option value="CUAS">CUAS</option>
                                                            </select><br>
                                                            <label>Observation Media: </label><input type="file" id="newObervationMedia"><br><br>
                                                            <button id="addPointBtn">Add Observation</button>`;


let geojsonObject = 
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          [
            -75.67166745894251,
            45.42933043383789
          ],
          [
            -75.6671199708729,
            45.42135143326155
          ],
          [
            -75.66274738619163,
            45.41631794516795
          ],
          [
            -75.66362190312806,
            45.41447631302282
          ],
          [
            -75.6707929420061,
            45.41349408465473
          ],
          [
            -75.672891782653,
            45.409196634677784
          ],
          [
            -75.66939371490814,
            45.4050216558756
          ],
          [
            -75.66921881152066,
            45.40293405075988
          ],
          [
            -75.66974352168221,
            45.3993726639888
          ],
          [
            -75.67394120297688,
            45.394582858861185
          ],
          [
            -75.67691456056109,
            45.38966981646345
          ],
          [
            -75.68286127572779,
            45.38807298572496
          ],
          [
            -75.68600953669942,
            45.386230432663325
          ],
          [
            -75.68600953669942,
            45.385247713139364
          ],
          [
            -75.68670915024839,
            45.38365075747626
          ],
          [
            -75.69003231460667,
            45.38254514635989
          ],
          [
            -75.69492960945033,
            45.38242229934545
          ],
          [
            -75.69982690429397,
            45.37885961981456
          ],
          [
            -75.69807787042112,
            45.37087348813739
          ],
          [
            -75.69230605864102,
            45.36190310338807
          ],
          [
            -75.69038212138075,
            45.35846203041899
          ],
          [
            -75.70245045510326,
            45.354774934288116
          ]
        ],
        "type": "LineString"
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

const url = 'https://maps.ottawa.ca/arcgis/rest/services/Zoning/MapServer';

let ottawaTileLayer = new ol.layer.Tile({source:new ol.source.TileArcGISRest({url: url})});

// draw source
let drawSource = new ol.source.Vector({wrapX: false});
let drawVectorLayer = new ol.layer.Vector({source: drawSource});

const map = new ol.Map({
    layers: [
        new ol.layer.Tile({ source: new ol.source.OSM()}),
        ottawaTileLayer,
        drawVectorLayer,
        vectorLayer
    ],
    target: 'map',
    view: new ol.View({
        center: [-75.6972, 45.4215],
        zoom: 14,
        projection: "EPSG:4326"
    }),
});


map.addControl(new OpenSideBarControl);
const modify = new ol.interaction.Modify({source: drawSource});
map.addInteraction(modify);
modify.on("modifyend", (evt)=>{
  // some modify events
})

map.on('click', async (evt) => {
    let mapFeatures = await drawVectorLayer.getFeatures(evt.pixel);
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
                                                                </div>`;
      let updateFeature = ()=>{
        mapFeatures[0].setProperties({
          name : document.getElementById("featureName").value,
          type : document.getElementById("featureType").value,
          orientation : document.getElementById("featureOrientation").value,
        })
      }
      document.getElementById("updateFeatureBtn").addEventListener("click", updateFeature);
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

// document.getElementById('zoom-out').onclick = function () {
//     const view = map.getView();
//     const zoom = view.getZoom();
//     view.setZoom(zoom - 1);
//     let line = turf.lineString([[-83, 30], [-84, 36], [-78, 41]]);
//     let options = {units: 'miles'};

//     let along = turf.along(line, 200, options);
//     console.log(along)
// };

// document.getElementById('zoom-in').onclick = function () {
// const view = map.getView();
// const zoom = view.getZoom();
// view.setZoom(zoom + 1);

// let vectorSourceFeatures = vectorLayer.getSource().getFeatures();
// let layerJson = new ol.format.GeoJSON().writeFeaturesObject(vectorSourceFeatures);
// };

