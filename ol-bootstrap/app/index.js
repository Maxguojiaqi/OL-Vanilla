// server command 
// npx http-server ./ -p 8000

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
          name: document.getElementById("newObservationName").value,
          contact: document.getElementById("newObservationContact").value,
          type: document.getElementById("newObservationType").value,
          media : document.getElementById("newObervationMedia").value,
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
        map.removeInteraction(polygonDraw);
        window.alert(`Number of observation within region: ${selectedObservationFeatures.length}`)
      })
    });

  }
}

class ApplyChangeControl extends ol.control.Control {
  /**
   * @param {Object} [opt_options] Control options.
   */
  constructor(opt_options) {
    const options = opt_options || {};
    const button = document.createElement('button');
    const element = document.createElement('div');
    element.className = 'commit-widget ol-unselectable';
    element.appendChild(button);
    super({
      element: element,
      target: options.target,
    });

    button.innerHTML = 'Apply Changes';
    button.addEventListener('click', () => {
      console.log("Apply Changes");
    });

  }
}



document.getElementById("addFeatureDrawerContent").innerHTML = `<label>Observation Name: </label><input type="text" id="newObservationName"><br>
                                                                <label>Contact: </label><input type="text" id="newObservationContact"><br>  
                                                                <label>Type: </label><br>
                                                                <select id="newObservationType">
                                                                  <option value="observation">observation</option>
                                                                  <option value="warning">warning</option>
                                                                  <option value="danger">danger</option>
                                                                </select><br>
                                                                <label>Observation Media: </label><input type="file" id="newObervationMedia"><br><br>
                                                                <button id="addObservationBtn">Add Observation</button><br><br>
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
          -75.72140919770361,
          45.39292648838264
        ],
        "type": "Point"
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.73029966048331,
          45.389148353456136
        ],
        "type": "Point"
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.66886681678847,
          45.39622483860944
        ],
        "type": "Point"
      }
    }
  ]
}

let hospitalIconStyle = new ol.style.Style({
  image: new ol.style.Icon({
    anchor: [0.5, 1],
    src: '../icons/hospital.png',
    scale: 0.06
  })
});

let hardwareIconStyle = new ol.style.Style({
  image: new ol.style.Icon({
    anchor: [0.5, 1],
    src: '../icons/hardware.png',
    scale: 0.18
  })
});

const fill = new ol.style.Fill({
  color: 'blue',
});
const stroke = new ol.style.Stroke({
  color: '#3399CC',
  width: 1.25,
});

let observationStyle = new ol.style.Style({
  image: new ol.style.Circle({
    fill: fill,
    stroke: stroke,
    radius: 6,
  })
});


let hospitalJsonVectorSource = new ol.source.Vector({
  features: new ol.format.GeoJSON().readFeatures(hospitalJson),
  projection: "EPSG:4326"
});

const hospitalJsonVectorLayer = new ol.layer.Vector({
  source: hospitalJsonVectorSource,
  style: hospitalIconStyle,
  visible: false
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
          -75.70152546066099,
          45.367318595893664
        ],
        "type": "Point"
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          -75.68775957343716,
          45.335481130545645
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
  source: hardwareJsonVectorSource,
  style: hardwareIconStyle,
  visible: false
});

// ottawa data source and layer
const url = 'https://maps.ottawa.ca/arcgis/rest/services/Zoning/MapServer';
let ottawaTileLayer = new ol.layer.Tile({source:new ol.source.TileArcGISRest({url: url})});

// observation source and layer
// let observationSource = new ol.source.Vector({wrapX: false});
// let observationLayer = new ol.layer.Vector({source: observationSource});

// select source and layer
let drawSelectSource = new ol.source.Vector({wrapX: false});
let drawSelectLayer = new ol.layer.Vector({source: drawSelectSource});

// observation layer source and layer

const observationSource = new ol.source.Vector({
  format: new ol.format.GeoJSON(),
  url: function (extent) {
    return (
      'http://localhost/geoserver/cite/ows?service=WFS&' +
      'version=1.1.0&request=GetFeature&typeName=cite%3Aobservation&maxFeatures=50&' +
      'outputFormat=application/json&srsname=EPSG:4326&' 
      +
      'bbox=' +
      extent.join(',') +
      ',EPSG:4326'
    );
  },
  strategy: ol.loadingstrategy.bbox,
});

const observationLayer = new ol.layer.Vector({
  source: observationSource,
  style: observationStyle,
});


const map = new ol.Map({
    layers: [
        new ol.layer.Tile({ source: new ol.source.OSM()}),
        ottawaTileLayer,
        hospitalJsonVectorLayer,
        hardwareJsonVectorLayer,
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

map.on('movestart', () => {
  hardwareJsonVectorLayer.setVisible(false);
  hospitalJsonVectorLayer.setVisible(false);
});


map.addControl(new OpenSideBarControl);
map.addControl(new ApplyChangeControl);
const observationModify = new ol.interaction.Modify({source: observationSource});
map.addInteraction(observationModify);
observationModify.on("modifyend", (evt)=>{
  // some modify events
})


let addNewFeature = () => {

  let coords = [-75.695281, 45.3345088];
  let typeVal = "sample_type";
  let nameVal = "sample_name";

  let requestBody = `
      <wfs:Transaction service="WFS" version="1.0.0"
        xmlns:wfs="http://www.opengis.net/wfs"
        xmlns:gml="http://www.opengis.net/gml"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.0.0/WFS-transaction.xsd http://www.openplans.org/cite http://localhost/geoserver/wfs/DescribeFeatureType?typename=docker:poi">
        <wfs:Insert>
          <poi>
            <geom>
              <gml:Point srsName="http://www.opengis.net/def/crs/EPSG/0/4326">
                        <gml:coordinates>
                          ${coords[1], coords[0]}
                        </gml:coordinates>
              </gml:Point>
            </geom>
            <type>${typeVal}</type>
            <name>${nameVal}</name>
          </poi>
        </wfs:Insert>
      </wfs:Transaction>
  `

  let requestOptions = {
    method: 'POST',
    headers: {'Content-Type': 'text/xml'},
    body: requestBody,
    redirect: 'follow'
  };

  fetch("http://localhost/geoserver/docker/wfs", requestOptions)
  .then(response => response.text())
  .then(result => console.log(result))
  .catch(error => console.log('error', error));
}

map.on('click', async (evt) => {
    let mapFeatures = await observationLayer.getFeatures(evt.pixel);
    if (mapFeatures.length != 0) {
      let mediaVal = "observation.png";
      if (mapFeatures[0].getProperties().media != null) {
        mediaVal = mapFeatures[0].getProperties().media.split("\\")[2];
      }
      document.getElementById("editDrawer").style.width = "250px";
      document.getElementById("closeEditDrawer").addEventListener("click", ()=>{document.getElementById("editDrawer").style.width = "0";} );
      document.getElementById("editDrawerContent").innerHTML = `<div id="currentObservation">
                                                                <h5>Name:</h5>
                                                                <label>${mapFeatures[0].getProperties().name}</label><br>
                                                                <h5>Type:</h5>
                                                                <label>${mapFeatures[0].getProperties().type}</label><br>
                                                                <h5>Media: </h5>
                                                                <label>${mediaVal}</label>
                                                                </div>
                                                        
                                                                <div id="editObservation" hidden>
                                                                  <label>Observation Name: </label><input type="text" id="editObservationName"><br>
                                                                  <label>Contact: </label><input type="text" id="editObservationContact"><br>  
                                                                  <label>Type: </label><br>
                                                                  <select id="editObservationType">
                                                                    <option value="observation">observation</option>
                                                                    <option value="warning">warning</option>
                                                                    <option value="danger">danger</option>
                                                                  </select><br>
                                                                  <label>Observation Media: </label><input type="file" id="editObervationMedia">
                                                                </div>
                                                                <hr>
                                                                <div>
                                                                  <button id="enableEditButton">Enable Edit</button>
                                                                  <button id="disableEditButton" hidden>Disable Edit</button>
                                                                  <button id="updateFeatureBtn" hidden>Apply Edit</button>
                                                                </div>
                                                                <br>
                                                                <div>
                                                                  <button id="findHospital">Find Hospital within 3 km</button><br><br>
                                                                  <button id="findHardwareStore">Find Hardware Store within 3km</button>
                                                                </div>`;
      document.getElementById("findHospital").addEventListener("click", ()=>{
        hospitalJsonVectorLayer.setVisible(true);
        // let currentObservationBuffer = ol.extent.buffer(mapFeatures[0].getGeometry().getExtent(), 0.03); 
        // let observationBufferGeometry = new ol.geom.Polygon.fromExtent(currentObservationBuffer);
        // let hospitalFeatures = jsonVectorSource.getFeatures();
        // let hospitalFeaturesWithin3km = [];
        // hospitalFeatures.forEach(hospitalFeature => {
        //   if (observationBufferGeometry.intersectsCoordinate(hospitalFeature.getGeometry().getCoordinates())) {
      
        //     // add the intersecting feature to the array
        //     hospitalFeaturesWithin3km.push(hospitalFeature);
        //   }
        // });
      });

      document.getElementById("findHardwareStore").addEventListener("click", ()=>{
        hardwareJsonVectorLayer.setVisible(true);
        // let currentObservationBuffer = ol.extent.buffer(mapFeatures[0].getGeometry().getExtent(), 0.03); 
        // let observationBufferGeometry = new ol.geom.Polygon.fromExtent(currentObservationBuffer);
        // let hardwareStoreFeatures = jsonVectorSource.getFeatures();
        // let hardwareFeautresWithin3km = [];
        // hardwareStoreFeatures.forEach(hospitalFeature => {
        //   if (observationBufferGeometry.intersectsCoordinate(hospitalFeature.getGeometry().getCoordinates())) {
      
        //     // add the intersecting feature to the array
        //     hardwareFeautresWithin3km.push(hospitalFeature);
        //   }
        // });
      });
      document.getElementById("updateFeatureBtn").addEventListener("click", ()=>{
        mapFeatures[0].setProperties({
          name : document.getElementById("editObservationName").value,
          type : document.getElementById("editObservationType").value,
          contact : document.getElementById("editObservationContact").value,
          media : document.getElementById("editObervationMedia").value,
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

