
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

                                                    
// draw source
let drawSource = new ol.source.Vector({wrapX: false});
let drawVectorLayer = new ol.layer.Vector({source: drawSource});

// the city of ottawa map server  
const url = 'https://maps.ottawa.ca/arcgis/rest/services/Zoning/MapServer';

let ottawaTileLayer = new ol.layer.Tile({source:new ol.source.TileArcGISRest({url: url})});

const map = new ol.Map({
    layers: [
        new ol.layer.Tile({source: new ol.source.OSM()}),
        ottawaTileLayer,
        jsonVectorSource,
        drawVectorLayer
    ],
    target: 'map',
    view: new ol.View({
      projection : "EPSG:4326",
      center: [-75.6972, 45.4215],
      zoom: 10
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
