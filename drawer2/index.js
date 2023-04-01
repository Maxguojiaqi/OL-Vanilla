
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
          orientation : document.getElementById("newFeatureOrientation").value,
        })
      
      })
    }

    document.getElementById("addPointBtn").addEventListener("click", addPointDraw);


  }
}


document.getElementById("addFeatureDrawerContent").innerHTML = `<p>Add new feature:</p>
                                                            <label>Feature Name: </label><input type="text" id="newFeatureName"><br>
                                                            <label>Feature Type: </label><br>
                                                            <select id="newFeatureType">
                                                              <option value="UAS">UAS</option>
                                                              <option value="GCS">GCS</option>
                                                              <option value="CUAS">CUAS</option>
                                                            </select><br>
                                                            <label>Orientation: </label><input type="text" id="newFeatureOrientation"><br>
                                                            <button id="addPointBtn">Add Point Asset</button>`;

// draw source
let drawSource = new ol.source.Vector({wrapX: false});
let drawVectorLayer = new ol.layer.Vector({source: drawSource});

const url = 'https://maps.ottawa.ca/arcgis/rest/services/Zoning/MapServer';

let ottawaTileLayer = new ol.layer.Tile({source:new ol.source.TileArcGISRest({url: url})});

const map = new ol.Map({
    layers: [
        new ol.layer.Tile({source: new ol.source.OSM()}),
        ottawaTileLayer,
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
      document.getElementById("editDrawerContent").innerHTML = `<ul>
                                                                  <li>Feature Type: <input type="text" id="featureType" value=${mapFeatures[0].getProperties().type}></li>
                                                                  <li>Feature Name: <input type="text" id="featureName" value=${mapFeatures[0].getProperties().name}></li>
                                                                  <li>Feature Orientation: <input type="text" id="featureOrientation" value=${mapFeatures[0].getProperties().orientation}></li>
                                                                </ul>
                                                                <button id="updateFeatureBtn">Update Feature</button>
                                                                <button id="removeFeatureBtn">Remove Feature</button>`;
      let removeFeature = ()=>{
        drawSource.removeFeature(mapFeatures[0]);
      }
      let updateFeature = ()=>{
        mapFeatures[0].setProperties({
          name : document.getElementById("featureName").value,
          type : document.getElementById("featureType").value,
          orientation : document.getElementById("featureOrientation").value,
        })
      }
      document.getElementById("updateFeatureBtn").addEventListener("click", updateFeature);
      document.getElementById("removeFeatureBtn").addEventListener("click", removeFeature);
    }
});
