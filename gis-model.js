const { exec } = require('child_process');
const path = require('path');
const EventEmitter = require("events")
const fs = require('fs');
const gisConfig = require('../gis/gis-config.json');

const VISUALIZER_LOADINGBAR_ID = 'visualizer-status-bar';
const VISUALIZER_DATACONTENT_ID = 'visualizer-data-content';

/**
 * GIS Model class used to handle visulaizer map functionality
 * GIS Model extends from event module 
 */
class GISModel extends EventEmitter {

	/**
	 * GIS Modal constructor
	 * @param {*string} formID The asset form where the GIS will live on
	 * @param {*object} geoserver The geoserver instance associate to this gis model
	 */
	constructor(formID, geoserver) {
		// bring in the functionalities of event class
		super();
		
		this.geoserver = geoserver;
		this.engagementPageID = formID;
		this.config = gisConfig;

		// emission heat map asset property, "emitterIndex" and "receiverHeightFromGround" will be provided by user
		// emitterUASIndex will only be used if emitter is UAS asset
		this.emissionHeatmapAssetProp = {
			emitterType: undefined,
			emitterLatitude: undefined,
			emitterLongitude: undefined,
			emitterAltitude: undefined,
			emitterHeightFromGround: undefined,
			emitterUASIndex: 0, 
			emitterIsUASManuver: false
		};
		this.featureStyles = {
			sensorStyle: new ol.style.Style({
				image: new ol.style.Icon({
					anchor: [0.5, 46],
					anchorXUnits: 'fraction',
					anchorYUnits: 'pixels',
					src: '../resources/gis/sensor.png',
					scale: 0.15
				})
			}),
			sensorModifyStyle: new ol.style.Style({
				image: new ol.style.Icon({
					anchor: [0.5, 46],
					anchorXUnits: 'fraction',
					anchorYUnits: 'pixels',
					src: '../resources/gis/sensor_modify.png',
					scale: 0.15
				})
			}),
			gcsStyle: new ol.style.Style({
				image: new ol.style.Icon({
					anchor: [0.5, 46],
					anchorXUnits: 'fraction',
					anchorYUnits: 'pixels',
					src: '../resources/gis/gcs.png',
					scale: 0.06
				})
			}),
			gcsModifyStyle: new ol.style.Style({
				image: new ol.style.Icon({
					anchor: [0.5, 46],
					anchorXUnits: 'fraction',
					anchorYUnits: 'pixels',
					src: '../resources/gis/gcs_modify.png',
					scale: 0.06
				})
			}),
			gcsSelectedStyle: new ol.style.Style({
				image: new ol.style.Icon({
					anchor: [0.5, 46],
					anchorXUnits: 'fraction',
					anchorYUnits: 'pixels',
					src: '../resources/gis/gcs_selected.png',
					scale: 0.06
				})
			}),
			poiStyle: new ol.style.Style({
				image: new ol.style.Circle({
					radius: 6,
					fill: new ol.style.Fill({
						color: '#14667f',
					})
				})
			}),
			poiModifyStyle: new ol.style.Style({
				image: new ol.style.Circle({
					radius: 6,
					fill: new ol.style.Fill({
						color: '#999999',
					})
				})
			}),
			customEmitterStyle: new ol.style.Style({
				image: new ol.style.Icon({
					anchor: [0.5, 46],
					anchorXUnits: 'fraction',
					anchorYUnits: 'pixels',
					src: '../resources/gis/customEmitter.png',
					scale: 0.06
				})
			}),
			customEmitterModifyStyle: new ol.style.Style({
				image: new ol.style.Icon({
					anchor: [0.5, 46],
					anchorXUnits: 'fraction',
					anchorYUnits: 'pixels',
					src: '../resources/gis/customEmitter_modify.png',
					scale: 0.06
				})
			}),
			uasModifyStyle: new ol.style.Style({
				image: new ol.style.Circle({
					radius: 5,
					fill: new ol.style.Fill({
						color: '#999999',
					})
				})
			}),
			uasManeuverStyle: new ol.style.Style({
				image: new ol.style.Icon({
					anchor: [0.5, 46],
					anchorXUnits: 'fraction',
					anchorYUnits: 'pixels',
					src: '../resources/gis/drone.png',
					scale: 0.3
				})
			}),
			uasManeuverSelectedStyle: new ol.style.Style({
				image: new ol.style.Icon({
					anchor: [0.5, 46],
					anchorXUnits: 'fraction',
					anchorYUnits: 'pixels',
					src: '../resources/gis/drone_selected.png',
					scale: 0.3
				})
			}),
			uasManeuverModifyStyle: new ol.style.Style({
				image: new ol.style.Icon({
					anchor: [0.5, 46],
					anchorXUnits: 'fraction',
					anchorYUnits: 'pixels',
					src: '../resources/gis/drone_modify.png',
					scale: 0.3
				})
			})
		}
		this.basemap = new ol.layer.Tile({ source: new ol.source.OSM() });

		// this layer is where all the drawings will live
		this.sensorVectorLayer = new ol.layer.Vector({ source: new ol.source.Vector({ wrapX: false }) });
		this.gcsVectorLayer = new ol.layer.Vector({ source: new ol.source.Vector({ wrapX: false }) });
		this.poiVectorLayer = new ol.layer.Vector({ source: new ol.source.Vector({ wrapX: false }) });
		this.customEmitterVectorLayer = new ol.layer.Vector({ source: new ol.source.Vector({ wrapX: false }) });
		this.uasVectorLayer = new ol.layer.Vector({ source: new ol.source.Vector({ wrapX: false }) });
		this.uasManeuverVectorLayer = new ol.layer.Vector({ source: new ol.source.Vector({ wrapX: false }) });

		// to store the cache of the styles for cluster
		const styleCache = {};
		this.isedEmitterVectorLayer = new ol.layer.Vector({
			source: new ol.source.Cluster({
				source: new ol.source.Vector({ wrapX: false })
			}),
			style: function (features) {
				if (features.get('features') != undefined){
					// when multiple feature, use the count as the key 
					const size = features.get('features').length;
					// style to be returned 
					let style;
					if (size > 1) {
						style = styleCache[size];
						if (!style){
							let radius = size * 6;
							style = new ol.style.Style({
									image: new ol.style.Circle({
									radius: radius,
									stroke: new ol.style.Stroke({
										color: '#fff',
									}),
									fill: new ol.style.Fill({
										color: 'black',
									}),
								}),
								text: new ol.style.Text({
									text: size.toString(),
									scale: 2,
									fill: new ol.style.Fill({
										color: '#fff',
									}),
								}),
							});
						}
						// store the new style in cache
						styleCache[size] = style;
					}	
					else if (size == 1){
						// when single feature, use the feature name as the key
						let name = features.get('features')[0].getProperties().name;
						style = styleCache[name];

						// if no key found from the cache, create new style
						if (!style){
							style = new ol.style.Style({
									image: new ol.style.Icon({
										anchor: [0.5, 46],
										anchorXUnits: 'fraction',
										anchorYUnits: 'pixels',
										src: '../resources/gis/isedEmitter.png',
										scale: 0.12
									}),
								text: new ol.style.Text({
									text: features.get('features')[0].getProperties().name,
									textAlign: 'center',
									scale: 2,
									offsetY: -2.5,
									textBaseline: 'bottom'
								}),
							});
						}
						// store the new style in cache
						styleCache[name] = style;
					}						
					return style;
				}
			}
		})

		// the geometry modify interaction to allow users to freely modify the features from the map
		this.sensorModify = new ol.interaction.Modify({ source: this.sensorVectorLayer.getSource(), style: this.featureStyles.sensorModifyStyle });
		this.gcsModify = new ol.interaction.Modify({ source: this.gcsVectorLayer.getSource(), style: this.featureStyles.gcsModifyStyle });
		this.poiModify = new ol.interaction.Modify({ source: this.poiVectorLayer.getSource(), style: this.featureStyles.poiModifyStyle });
		this.customEmitterModify = new ol.interaction.Modify({ source: this.customEmitterVectorLayer.getSource(), style: this.featureStyles.customEmitterModifyStyle });
		this.uasModify = new ol.interaction.Modify({ source: this.uasVectorLayer.getSource(), style: this.featureStyles.uasModifyStyle });
		this.uasManeuverModify = new ol.interaction.Modify({ source: this.uasManeuverVectorLayer.getSource(), style: this.featureStyles.uasManeuverModifyStyle });
		
		// this layer is where the input bound will live
		this.inputBoundLayer = new ol.layer.Vector({
			source: new ol.source.Vector({
				projection: "EPSG:4326"
			}),
			style: new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: 'blue',
					width: 3,
				}),
				fill: new ol.style.Fill({
					color: 'rgba(0, 0, 255, 0.1)',
				}),
			})
		});

		// this layer is where the output bound will live
		this.outputBoundLayer = new ol.layer.Vector({
			source: new ol.source.Vector({
				projection: "EPSG:4326"
			}),
			style: new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: 'red',
					width: 3,
				}),
				fill: new ol.style.Fill({
					color: 'rgba(255, 0, 0, 0.1)',
				}),
			})
		});

		// const scaleControl = new ol.control.ScaleLine();

		// construct the map with given location, and initialize the map with the layers and interactions 
		this.map = new ol.Map({
			layers: [this.basemap, this.inputBoundLayer, this.outputBoundLayer, this.sensorVectorLayer, this.gcsVectorLayer, this.poiVectorLayer, this.customEmitterVectorLayer, this.isedEmitterVectorLayer, this.uasVectorLayer, this.uasManeuverVectorLayer],
			controls : [
				new ol.control.ScaleLine({ units: 'metric'}),
				new ol.control.Zoom(),
				new ol.control.Rotate()
			],
			interactions: [...ol.interaction.defaults.defaults({ doubleClickZoom: false, mouseWheelZoom: false }).getArray(), this.sensorModify, this.gcsModify, this.poiModify, this.customEmitterModify, this.uasModify, this.uasManeuverModify],
			// controls: [...ol.control.defaults.defaults().getArray(), scaleControl],
			view: new ol.View({
				projection: 'EPSG:4326',
				center: this.config.defaultLocation,
				zoom: 15
			})
		});

		// bind all the OL events to the UI
		this.bindOLEventsToUI();

		// define the legend instance, the content will be filled in later
		this.mapLegend = new ol.legend.Legend({
			margin: 3,
			maxWidth: 100
		});

		// enable the 3D capability
		this.init3D();

		// Allow user zoom only on shift key pressed, this will prevent the map from zooming when user scroll the whole page
		let mouseWheelInt = new ol.interaction.MouseWheelZoom();
		this.map.addInteraction(mouseWheelInt);
		this.map.on('wheel', function (evt) {
			mouseWheelInt.setActive(ol.events.condition.shiftKeyOnly(evt));
		});

		// multiple sensor dic
		this.sensorFeatureDic = new Map();

		// multiple custom emitter dic
		this.customEmitterFeatureDic = new Map();
	}

	/**
	 * Initialize the map ID from dom and make sure it's unique
	 */
	initDOM() {
		this.mapID = `${this.engagementPageID.slice(1)}_map`;
		if ($(this.engagementPageID + " #map").length > 0) {
			$(this.engagementPageID + " #map")[0].id = this.mapID;
		}
	}

	/**
	 * Initialize the cesium related 3D capability
	 */
	init3D() {
		// open the usage of cesium
		Cesium.Ion.defaultAccessToken = this.config.cesiumToken;
		this.ol3d_map = new olcs.OLCesium({ map: this.map });
		let scene = this.ol3d_map.getCesiumScene();

		// only have drag and pinch for zoom, remove the wheel scroll
		scene.screenSpaceCameraController.zoomEventTypes = [Cesium.CameraEventType.RIGHT_DRAG, Cesium.CameraEventType.PINCH];
		let terrainProvider = new Cesium.CesiumTerrainProvider({
			url: Cesium.IonResource.fromAssetId(this.config.cesiumTerrainID),
		});
		const osmBuildingsTileset = Cesium.createOsmBuildings();
		scene.terrainProvider = terrainProvider;
		scene.primitives.add(osmBuildingsTileset);
		scene.globe.depthTestAgainstTerrain = true;
	}

	/**
	 * Bind all the OL map events.
	 */
	bindOLEventsToUI() {
		
		this.sensorModify.on("modifyend", async (evt) => {
			let modifiedSensorFeature = evt.features.getArray()[0];
			let sensorHeightFromGround = modifiedSensorFeature.getProperties().heightFromGround;
			let featureIndex = parseInt(modifiedSensorFeature.getProperties().featureIndex);
			let [sensorFeatureLat, sensorFeatureLong, sensorFeatureAlt] = await this.pointFeatureCoordsFinder(modifiedSensorFeature, sensorHeightFromGround);
			let sensorIsNew = false;
			this.emit("sensorUpdated", 
					featureIndex, 
					modifiedSensorFeature.getProperties().name, 
					sensorFeatureLat.toFixed(5), 
					sensorFeatureLong.toFixed(5), 
					sensorFeatureAlt, 
					sensorHeightFromGround,
					sensorIsNew);
		});

		this.gcsModify.on("modifyend", async (evt) => {
			let modifiedGCSFeature = evt.features.getArray()[0];
			let gcsHeightFromGround = modifiedGCSFeature.getProperties().heightFromGround;
			let [gcsFeatureLat, gcsFeatureLong, gcsFeatureAlt] = await this.pointFeatureCoordsFinder(modifiedGCSFeature, gcsHeightFromGround);

			// update emitter information if the emitter type is GCS
			if (this.emissionHeatmapAssetProp.emitterType == "GCS") {
				// update the feature icon color and set the label
				this.updatePointEmitterInfo(this.currentGCSFeature);
				this.emit("emitterUpdated", this.emissionHeatmapAssetProp);
			}
			// currently there is only one GCS
			let index = 1;
			let gcsIsNew = false;
			this.emit("gcsUpdated", 
					index, 
					modifiedGCSFeature.getProperties().name, 
					gcsFeatureLat.toFixed(5), 
					gcsFeatureLong.toFixed(5), 
					gcsFeatureAlt, 
					gcsHeightFromGround,
					gcsIsNew);
		});

		this.poiModify.on("modifyend", async (evt) => {
			let modifiedPOIFeature = evt.features.getArray()[0];
			let poiHeightFromGround = modifiedPOIFeature.getProperties().heightFromGround;
			let [poiFeatureLat, poiFeatureLong, poiFeatureAlt] = await this.pointFeatureCoordsFinder(modifiedPOIFeature, poiHeightFromGround);
			this.emit("poiUpdated", 
					poiFeatureLat.toFixed(5), 
					poiFeatureLong.toFixed(5), 
					poiFeatureAlt, 
					poiHeightFromGround);
		});

		this.customEmitterModify.on("modifyend", async (evt) => {
			let modifiedCustomEmitterFeature = evt.features.getArray()[0];
			let customEmitterHeightFromGround = modifiedCustomEmitterFeature.getProperties().heightFromGround;
			let [customEmitterFeatureLat, customEmitterFeatureLong, customEmitterFeatureAlt] = await this.pointFeatureCoordsFinder(modifiedCustomEmitterFeature, customEmitterHeightFromGround);
			
			// find the custom emitter index
			let index = parseInt(modifiedCustomEmitterFeature.getProperties().featureIndex);

			let customEmitterIsNew = false;

			this.emit("customEmitterUpdated", 
					index, 
					modifiedCustomEmitterFeature.getProperties().name, 
					customEmitterFeatureLat.toFixed(5), 
					customEmitterFeatureLong.toFixed(5), 
					customEmitterFeatureAlt, 
					customEmitterHeightFromGround,
					customEmitterIsNew);
		});

		this.uasModify.on("modifyend", async (evt) => {
			let modifiedUASFeature = evt.features.getArray()[0];
			let [flightTableData, elevationTableData] = await this.lineFeatureCoordsFinder(modifiedUASFeature);

			// reStyle the flight path
			let pointStyle = null;

			// update emitter information if the emitter type is UAS
			if (this.emissionHeatmapAssetProp.emitterType == "UAS") {
				let {0:waypointsLatArray, 1:waypointsLongArray, 2:waypointsAltArray, 3:waypointsHeightArray} = flightTableData;
				this.updateUASEmitterInfo(waypointsLatArray, waypointsLongArray, waypointsAltArray, waypointsHeightArray, modifiedUASFeature);
				this.emit("emitterUpdated", this.emissionHeatmapAssetProp);
			}
			else {
				// restyle and make sure the lable still there.
				this.styleFlightPath(this.currentUASFlightPathFeature, pointStyle);
				this.featureLabelSetter(this.currentUASFlightPathFeature);
			}
			// find the waypoints count
			let uasWaypointsCount = flightTableData[0].length;
			this.emit("uasPathUpdated", 1, 
					modifiedUASFeature.getProperties().name, 
					flightTableData, 
					elevationTableData, 
					uasWaypointsCount);
		});

		this.uasManeuverModify.on("modifyend", async (evt) => {
			let modifiedUASuasManeuverModifyFeature = evt.features.getArray()[0];
			let uasManeuverInitialPositionHeightFromGround = modifiedUASuasManeuverModifyFeature.getProperties().heightFromGround;
			let [uasManeuverInitialPositionFeatureLat, uasManeuverInitialPositionFeatureLong, uasManeuverInitialPositionFeatureAlt] = await this.pointFeatureCoordsFinder(modifiedUASuasManeuverModifyFeature, uasManeuverInitialPositionHeightFromGround);
			
			// currently there is only one UAS
			let index = 1;

			// for UAS maneuver, there is only one waypoint
			let numberOfWaypoints = 1;

			let uasPointIsNew = false;

			// update emitter information if the emitter type is UAS and is using maneuver
			if (this.emissionHeatmapAssetProp.emitterType == "UAS" && this.emissionHeatmapAssetProp.emitterIsUASManuver) {
				// update the feature icon color and set the label
				this.updatePointEmitterInfo(modifiedUASuasManeuverModifyFeature);
				this.emit("emitterUpdated", this.emissionHeatmapAssetProp);
			}

			this.emit("uasPointUpdated", 
					index, 
					modifiedUASuasManeuverModifyFeature.getProperties().name, 
					uasManeuverInitialPositionFeatureLat.toFixed(5), 
					uasManeuverInitialPositionFeatureLong.toFixed(5), 
					uasManeuverInitialPositionFeatureAlt, 
					uasManeuverInitialPositionHeightFromGround,
					numberOfWaypoints,
					uasPointIsNew);
		});

		// Display the click feature's information on the page  
		this.map.on("singleclick", async (evt) => {

			let clickedGCSFeatures = await this.gcsVectorLayer.getFeatures(evt.pixel);
			let clickedUASFeatures = await this.uasVectorLayer.getFeatures(evt.pixel);
			let clickedManeuverFeatures = await this.uasManeuverVectorLayer.getFeatures(evt.pixel);
			if (clickedGCSFeatures.length != 0) {
				let selectedGCSFeature = clickedGCSFeatures[0];
				this.handleGCSMapSelect(selectedGCSFeature);
			}
			else if (clickedUASFeatures.length != 0) {
				let clickCoord = await this.map.getCoordinateFromPixel(evt.pixel);
				let selectedUASFeature = clickedUASFeatures[0];
				this.handleUASMapSelect(selectedUASFeature, clickCoord);
			}
			else if (clickedManeuverFeatures.length != 0) {
			
				let clickCoord = await this.map.getCoordinateFromPixel(evt.pixel);
				let selectedManeuverFeature = clickedManeuverFeatures[0];
				this.handleUASManeuverMapSelect(selectedManeuverFeature);
			}

		});
	}

	/**
	 * Method to set the current emission heatmap layer
	 * * @param {*string} layerName The layer name from the geoserver
	 * * @param {*string} geoserverWorkSpaceName The input workspace name from the geoserver
	 * * @param {*string} heatmapType The heatmap type could be detection, coverage or singleRun
	 */
	setHeatmapLayer(layerName, geoserverWorkSpaceName, heatmapType) {

		// if the heatmaplayer already exists, try remove it from the map
		if (this.heatmapLayer) this.map.removeLayer(this.heatmapLayer);

		// add the new heatmap layer to map
		this.heatmapLayer = this.addGeoServerWMSTileLayer(layerName, geoserverWorkSpaceName, 0.7);
		
		// set the legend for the heatmap layer
		this.handleMapLegend(heatmapType);
	}

	/**
	 * Method to set the current emission heatmap layer
	 * * @param {*string} layerName The layer name from the geoserver
	 * * @param {*string} geoserverWorkSpaceName The input workspace name from the geoserver
	 */
	setDTEDMapLayer(layerName, geoserverWorkSpaceName) {

		// if the heatmaplayer already exists, try remove it from the map
		if (this.terrainLayer) this.map.removeLayer(this.terrainLayer);

		// add the new heatmap layer to map
		this.terrainLayer = this.addGeoServerWMSTileLayer(layerName, geoserverWorkSpaceName, 0.7);
		// the default new layer is not visible till toggle on.
		this.terrainLayer.setVisible(false);
	}


	/**
	 * Method to set the current emission heatmap layer
	 * * @param {*string} heatmapType The heatmap type could be detection, coverage or singleRun
	 */
	handleMapLegend(heatmapType){
		// Assign legend title 
		let legendTitle = heatmapType === "emission" ? `Power\n(dBm)`
		: heatmapType === "detection" ? "PoD\n(%)"
		: heatmapType === "measurement" ? "AoA\nError(°)"
		:  `Coverage`;

		// Assign legend PNG 
		let legendImageSource = heatmapType === "emission" ? `../resources/gis/legend_emissionHeatmap.png`
		: heatmapType === "detection" ? `../resources/gis/legend_detectionHeatmap.png`
		: heatmapType === "measurement" ? `../resources/gis/legend_measurementHeatmap.png`
		:  `../resources/gis/legend_receptionHeatmap.png`;

		// define the legend instance, the content will be filled in later
		this.mapLegend = new ol.legend.Legend({
		margin: 3,
		maxWidth: 100,
		title: legendTitle,

		// overwrite the style to make the title smaller
		titleStyle: new ol.style.Text({ font: "bold 12px sans-serif", textAlign: "left", justify: "left" })
		});
		this.mapLegend.addItem(new ol.legend.Image({
		src: legendImageSource
		}))

		// Create a legend control if it's not defined 
		if (this.legendControl) this.map.removeControl(this.legendControl);

		// re-create the legend control, else the change won't be reflected in runtime
		this.legendControl = new ol.control.Legend({
		legend: this.mapLegend,
		collapsed: true
		});

		// add legend control to map after it is created
		this.map.addControl(this.legendControl);
	}

	/**
	 * Emitter select from the GCS
	 * @param {*OLfeature} gcsFeature The gcs feature
	 */
	handleGCSMapSelect(gcsFeature) {
		// clear the previous emitter info
		this.clearSimulationEmitterInfo();
		this.emissionHeatmapAssetProp.emitterType = "GCS"
		// clear the uas feature style 
		if (this.currentUASFlightPathFeature) {
			this.styleFlightPath(this.currentUASFlightPathFeature);
			this.featureLabelSetter(this.currentUASFlightPathFeature);
		}
		if (this.currentUASManeuverPointFeature) {
			this.currentUASManeuverPointFeature.setStyle(this.featureStyles.uasManeuverStyle);
			this.featureLabelSetter(this.currentUASManeuverPointFeature);
		}
		// update the emitter info and emit the change to the UI
		this.updatePointEmitterInfo(gcsFeature);
		this.emit("emitterUpdated", this.emissionHeatmapAssetProp);
	}

	/**
	 * Emitter select from the UAS maneuver 
	 * @param {*OLfeature} uasManeuverFeature The uas Maneuver feature
	 */
	handleUASManeuverMapSelect(uasManeuverFeature) {
		// clear the previous emitter info
		this.clearSimulationEmitterInfo();
		this.emissionHeatmapAssetProp.emitterType = "UAS"
		this.emissionHeatmapAssetProp.emitterIsUASManuver = true;
		// clear the gcs feature style 
		// because UAS maneuver and UAS flight path are mutually exclusive, don't need to check the UAS flight path
		if (this.currentGCSFeature) {
			this.currentGCSFeature.setStyle(this.featureStyles.gcsStyle);
			this.featureLabelSetter(this.currentGCSFeature);
		}
		// update the emitter info and emit the change to the UI
		this.updatePointEmitterInfo(uasManeuverFeature);
		this.emit("emitterUpdated", this.emissionHeatmapAssetProp);
	}

	/**
	 * Method to handle the emitter select for UAS
	 * @param {*OLfeature} uasFeature The uas feature
	 * @param {*array} clickCoord The the coordinates of the click location
	 */
	handleUASMapSelect(uasFeature, clickCoord) {
		// clear the previous emitter info
		this.clearSimulationEmitterInfo();
		// clear the gcs feature style 
		// because UAS maneuver and UAS flight path are mutually exclusive, don't need to check the UAS maneuver
		if (this.currentGCSFeature) {
			this.currentGCSFeature.setStyle(this.featureStyles.gcsStyle);
			this.featureLabelSetter(this.currentGCSFeature);
		}

		// find the UAS coords 
		let uasFeatureCoords = uasFeature.getGeometry().getCoordinates();
		let closestDistance = Infinity;
		let closestPointIndex = 0;
		let closestCoord = [];

		// find the closest waypoint from the flight path by compareing the distance
		uasFeatureCoords.forEach((pointCoord, index) => {
			let distance = new ol.geom.LineString([clickCoord, pointCoord]).transform("EPSG:4326", "EPSG:3857").getLength();
			if (distance < closestDistance) {
				closestDistance = distance;
				closestPointIndex = index;
				closestCoord = pointCoord;
			}
		});

		// new selected point style for the uas 
		let pointStyle = new ol.style.Style({
			geometry: new ol.geom.Point(closestCoord),
			image: new ol.style.Circle({
				radius: 5,
				fill: new ol.style.Fill({
					color: 'red',
				})
			})
		});

		// re-assign the line style to show the selected point
		this.styleFlightPath(uasFeature, pointStyle)
		this.featureLabelSetter(uasFeature);
		this.emissionHeatmapAssetProp.emitterType = "UAS";
		this.emissionHeatmapAssetProp.emitterLatitude = uasFeature.getGeometry().getCoordinates()[closestPointIndex][1];
		this.emissionHeatmapAssetProp.emitterLongitude = uasFeature.getGeometry().getCoordinates()[closestPointIndex][0];
		this.emissionHeatmapAssetProp.emitterAltitude = uasFeature.getGeometry().getCoordinates()[closestPointIndex][2];
		this.emissionHeatmapAssetProp.emitterHeightFromGround = uasFeature.getProperties().uasWaypointsGroundHeightArray[closestPointIndex];
		this.emissionHeatmapAssetProp.emitterUASIndex = closestPointIndex;
		this.emit("emitterUpdated", this.emissionHeatmapAssetProp);
	}

	/**
	 * Method to retrive the elevation of certain location 
	 * @param {*double} latitude The latitude of location 
	 * @param {*double} longitude The longitude of location 
	 */
	retrieveLocationElevation = async (latitude, longitude) => {
		let terrainProvider = new Cesium.CesiumTerrainProvider({
			url: Cesium.IonResource.fromAssetId(this.config.cesiumTerrainID),
		});
		let positions = [Cesium.Cartographic.fromDegrees(longitude, latitude)];
		let updatedPositions = await Cesium.sampleTerrain(terrainProvider, 11, positions);

		// height only needs 2 decimal places
		let elevationVal = updatedPositions[0].height.toFixed(2)
		return parseFloat(elevationVal);
	}

	/**
	 * Method to set the label text of feature
	 * @param {*OLfeature} feature The map feature
	 */
	featureLabelSetter = (feature) => {
		if (feature != undefined) {
			let labelText = feature.getProperties().name;

			// handle point feature
			if (!Array.isArray(feature.getStyle())) {
				// deep copy the style so all features won't share one style reference
				let newFeatureStyle =  Object.create(feature.getStyle());
				newFeatureStyle.setText(new ol.style.Text(
				{
					text: labelText,
					textAlign: 'center',
					scale: 2,
					offsetY: -2.5,
					textBaseline: 'bottom'
				}));

				feature.setStyle(newFeatureStyle);
			}
			// handle line or polygon feature
			else {
				let styleArray = feature.getStyle();
				styleArray[1].setText(new ol.style.Text(
					{
						text: labelText,
						textAlign: 'center',
						scale: 2,
						offsetY: -2.5,
						textBaseline: 'bottom'
					}));
				feature.setStyle(styleArray); // line feature need to manully reset the style to make lable show
			}
		}
	}

	/**
	 * Method to style flight path on the fly 
	 * @param {*OLfeature} feature The flight path feature
	 * @param {*OLStyle} additionalStyle The additionalStyle for the feature
	 */
	styleFlightPath = function (feature, additionalStyle = null) {
		const lineStringGeometry = feature.getGeometry();
		const styles = [
			// linestring
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					width: 3,
					color: "black"
				}),
			}),
		];

		// icon style
		let lastPointCoords = lineStringGeometry.getLastCoordinate();
		styles.push(
			new ol.style.Style({
				geometry: new ol.geom.Point(lastPointCoords),
				image: new ol.style.Icon({
					anchor: [0.5, 46],
					anchorXUnits: 'fraction',
					anchorYUnits: 'pixels',
					src: '../resources/gis/drone.png',
					scale: 0.3
				})
			})
		);

		// the additional style helps the select effect
		if (additionalStyle != null) styles.push(additionalStyle);
		feature.setStyle(styles);
	};

	/**
	 * Method to initialize the sensor draw 
	 * @param {*integer} index The current sensor index
	 * @param {*string} sensorName The current sensor name
	 */
	addSensorDraw = async (index, sensorName) => {
		let currentObj = this;
		currentObj.sensorDraw = new ol.interaction.Draw({
			source: currentObj.sensorVectorLayer.getSource(),
			stopClick: true,
			type: "Point",
			style: this.featureStyles.sensorStyle
		});

		currentObj.map.addInteraction(currentObj.sensorDraw);
		// add sensor interaction method
		currentObj.sensorDraw.on('drawend', async function (evt) {

			// when finish, remove the draw from map's interaction
			currentObj.cleanDrawEvents();

			let newSensorFeature = evt.feature;
			// update the feature style
			newSensorFeature.setStyle(currentObj.featureStyles.sensorStyle);

			// load the default height from ground for sensor
			let heightFromGround = currentObj.config.sensorDefaults.heightFromGround;

			// check if the sensor is new sensor
			let isNewSensor = true;

			if (currentObj.sensorFeatureDic.has(index)) {
				// if the sensor is already in the dictionary, remove the old one
				currentObj.sensorVectorLayer.getSource().removeFeature(currentObj.sensorFeatureDic.get(index));
				isNewSensor = false;
			}
			// Add/Reassign the sensor to the feature dictionary
			currentObj.sensorFeatureDic.set(index, newSensorFeature);
			// assign sensor name and index to the feature
			newSensorFeature.setProperties({ featureIndex: index, name: sensorName });
			let [sensorFeatureLat, sensorFeatureLong, sensorFeatureAlt] = await currentObj.pointFeatureCoordsFinder(newSensorFeature, heightFromGround);
			// sensor updated emitter to pass in the lat, long, alt and height from ground.
			currentObj.emit("sensorUpdated", 
						index, 
						sensorName, 
						sensorFeatureLat.toFixed(5), 
						sensorFeatureLong.toFixed(5), 
						sensorFeatureAlt, 
						heightFromGround, 
						isNewSensor);
		});
	}

	/**
	 * Method to initialize the GCS draw 
	 * @param {*integer} index The current GCS index
	 * @param {*string} gcsName The current ground control station name
	 */
	addGCSDraw = async (index, gcsName) => {
		let currentObj = this;
		currentObj.gcsDraw = new ol.interaction.Draw({
			source: currentObj.gcsVectorLayer.getSource(),
			stopClick: true,
			type: "Point",
			style: this.featureStyles.gcsStyle
		});

		currentObj.map.addInteraction(currentObj.gcsDraw);

		// add gcs interaction method
		currentObj.gcsDraw.on('drawend', async function (evt) {

			// when finish, remove the draw from map's interaction
			currentObj.cleanDrawEvents();

			// check if the gcs is new 
			let gcsIsNew = true;

			if (currentObj.currentGCSFeature) {
				currentObj.gcsVectorLayer.getSource().removeFeature(currentObj.currentGCSFeature);
				gcsIsNew = false;
			}

			// lock the newly created gcs feature as the current selected
			currentObj.currentGCSFeature = evt.feature;

			// update the feature style
			currentObj.currentGCSFeature.setStyle(currentObj.featureStyles.gcsStyle);

			// load default height from ground for GCS
			let heightFromGround = currentObj.config.gcsDefaults.heightFromGround;
			let [gcsFeatureLat, gcsFeatureLong, gcsFeatureAlt] = await currentObj.pointFeatureCoordsFinder(currentObj.currentGCSFeature, heightFromGround);

			// assign GCS name to the feature
			currentObj.currentGCSFeature.setProperties({ ...currentObj.currentGCSFeature.getProperties(), name: gcsName });

			// assign the text label to the feature
			currentObj.featureLabelSetter(currentObj.currentGCSFeature);

			// sensor updated emitter to pass in the lat, long, alt and height from ground.
			currentObj.emit("gcsUpdated", 
						index, 
						gcsName, 
						gcsFeatureLat.toFixed(5), 
						gcsFeatureLong.toFixed(5), 
						gcsFeatureAlt, 
						heightFromGround,
						gcsIsNew);
		})

	}

	/**
	 * Method to initialize the POI draw 
	 * @param {*string} poiName The current Point of Interest Name
	 */
	addPOIDraw = async (poiName) => {
		let currentObj = this;
		currentObj.poiDraw = new ol.interaction.Draw({
			source: currentObj.poiVectorLayer.getSource(),
			stopClick: true,
			type: "Point",
			style: this.featureStyles.poiStyle
		});

		currentObj.map.addInteraction(currentObj.poiDraw);

		// add poi interaction method
		currentObj.poiDraw.on('drawend', async function (evt) {

			// when finish, remove the draw from map's interaction
			currentObj.cleanDrawEvents();

			if (currentObj.currentPOIFeature) {
				currentObj.poiVectorLayer.getSource().removeFeature(currentObj.currentPOIFeature);
			}

			// lock the newly created poi feature as the current selected
			currentObj.currentPOIFeature = evt.feature;

			// update the feature style
			currentObj.currentPOIFeature.setStyle(currentObj.featureStyles.poiStyle);
			// load default height from ground for POI
			let heightFromGround = currentObj.config.poiDefaults.heightFromGround;
			let [poiFeatureLat, poiFeatureLong, poiFeatureAlt] = await currentObj.pointFeatureCoordsFinder(currentObj.currentPOIFeature, heightFromGround);
			// assign POI name to the feature
			currentObj.currentPOIFeature.setProperties({ ...currentObj.currentPOIFeature.getProperties(), name: poiName });

			// assign the text label to the feature
			currentObj.featureLabelSetter(currentObj.currentPOIFeature);

			// poi updated emitter to pass in the lat, long, alt and height from ground.
			currentObj.emit("poiUpdated", poiFeatureLat.toFixed(5), poiFeatureLong.toFixed(5), poiFeatureAlt, heightFromGround);
		})

	}

	/**
	 * Method to initialize the Custom Emitter draw 
	 * @param {*integer} index The current custom emitter index
	 * @param {*string} customEmitterName The current custom emitter Name
	 */
	addCustomEmitterDraw = async (index, customEmitterName) => {
		let currentObj = this;
		currentObj.customEmitterDraw = new ol.interaction.Draw({
			source: currentObj.customEmitterVectorLayer.getSource(),
			stopClick: true,
			type: "Point",
			style: this.featureStyles.customEmitterStyle
		});

		currentObj.map.addInteraction(currentObj.customEmitterDraw);

		// add poi interaction method
		currentObj.customEmitterDraw.on('drawend', async function (evt) {

			// when finish, remove the draw from map's interaction
			currentObj.cleanDrawEvents();

			// lock the newly created poi feature as the current selected
			let newCustomEmitterFeature = evt.feature;

			// update the feature style
			newCustomEmitterFeature.setStyle(currentObj.featureStyles.customEmitterStyle);
			// load default height from ground for emitter
			let heightFromGround = currentObj.config.emitterDefaults.heightFromGround;

			// check if the custom emitter is new
			let customEmitterIsNew = true;

			if (currentObj.customEmitterFeatureDic.has(index)) {
				// if the custom emitter already in the dictionary, remove the old one
				currentObj.customEmitterVectorLayer.getSource().removeFeature(currentObj.customEmitterFeatureDic.get(index));
				customEmitterIsNew = false;
			}
			// Add/Reassign the custom emitter to the feature dictionary
			currentObj.customEmitterFeatureDic.set(index, newCustomEmitterFeature);
			// assign sensor name and index to the feature
			newCustomEmitterFeature.setProperties({ featureIndex: index, name: customEmitterName });

			let [customEmitterFeatureLat, customEmitterFeatureLong, customEmitterFeatureAlt] = await currentObj.pointFeatureCoordsFinder(newCustomEmitterFeature, heightFromGround);
			// assign POI name to the feature
			newCustomEmitterFeature.setProperties({ ...newCustomEmitterFeature.getProperties(), name: customEmitterName });

			// poi updated emitter to pass in the lat, long, alt and height from ground.
			currentObj.emit("customEmitterUpdated", 
						index, 
						customEmitterName, 
						customEmitterFeatureLat.toFixed(5), 
						customEmitterFeatureLong.toFixed(5), 
						customEmitterFeatureAlt, 
						heightFromGround,
						customEmitterIsNew);
		})
	}

	/**
	 * Method to initialize the UAS Maneuver draw 
	 * @param {*integer} index The current UAS index
	 * @param {*string} uasName The current UAS Name
	 */
	addUASManeuverPointDraw = async (index, uasName) => {
		let currentObj = this;
		currentObj.uasManeuverPointDraw = new ol.interaction.Draw({
			source: currentObj.uasManeuverVectorLayer.getSource(),
			stopClick: true,
			type: "Point",
			style: this.featureStyles.uasManeuverStyle
		});

		currentObj.map.addInteraction(currentObj.uasManeuverPointDraw);

		// add poi interaction method
		currentObj.uasManeuverPointDraw.on('drawend', async function (evt) {

			// when finish, remove the draw from map's interaction
			currentObj.cleanDrawEvents();

			// clear the current UAS maneuver point feature or flight path feature if exist
			if (currentObj.currentUASFlightPathFeature) {
				currentObj.uasVectorLayer.getSource().removeFeature(currentObj.currentUASFlightPathFeature);
				currentObj.currentUASFlightPathFeature = undefined;
			}

			// check if the uasPoint is new 
			let isNewUASPoint = true;

			if (currentObj.currentUASManeuverPointFeature) {
				currentObj.uasManeuverVectorLayer.getSource().removeFeature(currentObj.currentUASManeuverPointFeature);
				currentObj.currentUASManeuverPointFeature = undefined;
				isNewUASPoint = false;
			}

			// lock the newly created poi feature as the current selected
			currentObj.currentUASManeuverPointFeature = evt.feature;

			// // update the feature style
			currentObj.currentUASManeuverPointFeature.setStyle(currentObj.featureStyles.uasManeuverStyle);
			// load default height from ground for UAS
			let heightFromGround = currentObj.config.uasDefaults.heightFromGround;
			let [UASManeuverPointFeatureLat, UASManeuverPointFeatureLong, UASManeuverPointFeatureAlt] = await currentObj.pointFeatureCoordsFinder(currentObj.currentUASManeuverPointFeature, heightFromGround);
			// // assign POI name to the feature
			currentObj.currentUASManeuverPointFeature.setProperties({ ...currentObj.currentUASManeuverPointFeature.getProperties(), name: uasName });

			// assign the text label to the feature
			currentObj.featureLabelSetter(currentObj.currentUASManeuverPointFeature);
			
			let uasWaypointsCount = 1;
			// uas updated emitter to pass in the inedx, name, UASManeuverPointFeatureLat , UASManeuverPointFeatureLong , UASManeuverPointFeatureAlt , heightFromGround.
			currentObj.emit("uasPointUpdated", 
						index, 
						uasName, 
						UASManeuverPointFeatureLat.toFixed(5),
						UASManeuverPointFeatureLong.toFixed(5), 
						UASManeuverPointFeatureAlt.toFixed(5), 
						heightFromGround, 
						uasWaypointsCount,
						isNewUASPoint);

		})

	}

	/**
	 * Method to initialize the UAS draw 
	 * @param {*integer} index The current UAS index
	 * @param {*string} uasName The current UAS Name
	 */
	addUASFlightPathDraw = (index, uasName) => {
		let currentObj = this;
		currentObj.flightPathDraw = new ol.interaction.Draw({
			source: currentObj.uasVectorLayer.getSource(),
			stopClick: true,
			type: "LineString",
			style: new ol.style.Style({
				image: new ol.style.Icon({
					anchor: [0.5, 46],
					anchorXUnits: 'fraction',
					anchorYUnits: 'pixels',
					src: '../resources/gis/drone.png',
					scale: 0.3
				}),
				stroke: new ol.style.Stroke({
					width: 3,
					color: "black"
				})
			})
		});

		currentObj.map.addInteraction(currentObj.flightPathDraw);

		currentObj.flightPathDraw.on('drawend', async (evt) => {

			currentObj.styleFlightPath(evt.feature);
			currentObj.cleanDrawEvents();

			// clear the current UAS maneuver point feature or flight path feature if exist
			if (currentObj.currentUASFlightPathFeature) {
				currentObj.uasVectorLayer.getSource().removeFeature(currentObj.currentUASFlightPathFeature);
				currentObj.currentUASFlightPathFeature = undefined;
			}
			if (currentObj.currentUASManeuverPointFeature) {
				currentObj.uasManeuverVectorLayer.getSource().removeFeature(currentObj.currentUASManeuverPointFeature);
				currentObj.currentUASManeuverPointFeature = undefined;
			}
			currentObj.currentUASFlightPathFeature = evt.feature;

			// assign UAS flight path signature
			currentObj.currentUASFlightPathFeature.setProperties({ ...currentObj.currentUASFlightPathFeature.getProperties(), name: uasName });

			// find the flight path feature coords and count
			let [flightTableData, elevationTableData] = await currentObj.lineFeatureCoordsFinder(currentObj.currentUASFlightPathFeature);
			let uasWaypointsCount = flightTableData[0].length;

			// update the UI waypoints table data
			currentObj.flightPathData = flightTableData;

			// update the label on the map
			currentObj.featureLabelSetter(currentObj.currentUASFlightPathFeature);

			// uas updated emitter to pass in the flightTableData, elevationTableData, uasWaypointsValue
			currentObj.emit("uasPathUpdated", index, uasName, flightTableData, elevationTableData, uasWaypointsCount);
		})
	}

	/**
	 * Method to find the 3D coordinates for point feature and update it
	 * @param {*olFeature} pointFeature The pointFeature 
	 * @param {*double} heightFromGround The height from ground value
	 */
	async pointFeatureCoordsFinder(pointFeature, heightFromGround) {

		// find and update coords 
		let coordinates = pointFeature.getGeometry().getCoordinates();
		let groundElevation = await this.retrieveLocationElevation(coordinates[1], coordinates[0]);
		let featureAlt = groundElevation + heightFromGround
		pointFeature.getGeometry().setCoordinates([coordinates[0], coordinates[1], featureAlt]);

		// update the property value
		pointFeature.setProperties({ ...pointFeature.getProperties(), groundElevation: groundElevation, heightFromGround: heightFromGround });

		return [coordinates[1], coordinates[0], featureAlt];
	}
	/**
	 * Method to find the 3D coordinates for line feature and update it
	 * @param {*olFeature} lineFeature The line feature 
	 * @param {*double} heightFromGround The height from ground value
	 */
	async lineFeatureCoordsFinder(lineFeature) {
		// finding the altitude at each point
		let lineCoordsList = lineFeature.getGeometry().getCoordinates();
		let uasTable2DArray = [[], [], [], [], [], []];
		let elevation2DArray = [[]];
		let lineCoordsListWithZ = [];
		let uasWaypointsElevationArray = [];
		let uasWaypointsGroundHeightArray = [];

		// Latitude, Longitude, Altitude, Height From Ground, Hover Time, Speed
		for (const [index, coords] of lineCoordsList.entries()) {
			let groundElevation = await this.retrieveLocationElevation(coords[1], coords[0]);
			// by default, use the default from config file, if the uasWaypointsGroundHeightArray exist, find the ground height from the array using index.
			let heightFromGround = this.config.uasDefaults.heightFromGround;
			if (lineFeature.getProperties().uasWaypointsGroundHeightArray && lineFeature.getProperties().uasWaypointsGroundHeightArray[index] != undefined) heightFromGround = parseFloat(lineFeature.getProperties().uasWaypointsGroundHeightArray[index]);
			// value to be stored within the feature
			uasWaypointsElevationArray.push(groundElevation)
			uasWaypointsGroundHeightArray.push(heightFromGround)
			let altAtPoint = groundElevation + heightFromGround
			lineCoordsListWithZ.push([coords[0], coords[1], altAtPoint]);

			// value to be updated from the UI table for lat, long display 5 decimal places
			uasTable2DArray[0].push(coords[1].toFixed(5));
			uasTable2DArray[1].push(coords[0].toFixed(5));

			// for height display 2 decimal places
			uasTable2DArray[2].push(altAtPoint.toFixed(2));
			uasTable2DArray[3].push(heightFromGround.toFixed(2));
			uasTable2DArray[4].push(0);
			uasTable2DArray[5].push(10);

			elevation2DArray[0].push(groundElevation.toFixed(2));
		}
		// update the flight path with Z value to enable 3D capability
		lineFeature.getGeometry().setCoordinates(lineCoordsListWithZ);
		lineFeature.setProperties({ ...lineFeature.getProperties(), uasWaypointsElevationArray: uasWaypointsElevationArray, uasWaypointsGroundHeightArray: uasWaypointsGroundHeightArray });
		return [uasTable2DArray, elevation2DArray]
	}

	/**
	 * Method to update the Sensor feature from map
	 * @param {*string} sensorIndex The index of the sensor from the sensor dictionary
	 * @param {*string} latitude The latitude of the feature location
	 * @param {*string} longitude The longitude of the feature location
	 * @param {*string} heightFromGround The height from ground of the feature location
	 */
	async updateSensorFeatureLocation(sensorIndex, latitude, longitude, heightFromGround) {
		let groundElevation = await this.retrieveLocationElevation(parseFloat(latitude), parseFloat(longitude));

		// default feature alt is the sea level plus sensor default height from ground
		let featureAlt = groundElevation + this.config.sensorDefaults.heightFromGround;

		// get the current sensor feature from feature dictionary
		let currentSensorFeature = this.sensorFeatureDic.get(sensorIndex);

		// update feature properties 
		currentSensorFeature.setProperties({ "heightFromGround": parseFloat(heightFromGround), "groundElevation": parseFloat(groundElevation) });
		featureAlt = parseFloat(groundElevation) + parseFloat(heightFromGround);

		// update feature location
		currentSensorFeature.getGeometry().setCoordinates([parseFloat(longitude), parseFloat(latitude), parseFloat(featureAlt)]);

		// for height, use 2 decimal places 
		return featureAlt.toFixed(2);
	}

	/**
	 * Method to update the Sensor name from map
	 * @param {*integer} sensorIndex The sensor index to uniquely identify the sensor from the KVPs
	 * @param {*string} newSensorName The new SensorName for the sensor
	 */
	updateSensorName(sensorIndex, newSensorName) {
		// let associatedSensorFeature = this.sensorFeatureDic[sensorIndex];
		let associatedSensorFeature = this.sensorFeatureDic.get(sensorIndex);
		// update feature properties 
		associatedSensorFeature.setProperties({ "name": newSensorName });
		this.featureLabelSetter(associatedSensorFeature);
	}

	/**
	 * Method to update the GCS name from map
	 * @param {*string} newGCSName The new GCS name for the GCS
	 * @param {*integer} gcsIndex The gcs index to uniquely identify the gcs from the KVPs
	 */
	updateGCSName(newGCSName) {
		let associatedSensorFeature = this.currentGCSFeature;
		// update feature properties 
		associatedSensorFeature.setProperties({ "name": newGCSName });
		this.featureLabelSetter(associatedSensorFeature);
	}

	/**
	 * Method to update the uas name from map
	 * @param {*integer} uasIndex The uas index to uniquely identify the uas from the KVPs
	 * @param {*string} newUASName The new name for the UAS
	 */
	updateUASName(newUASName) {
		let associatedUASFeature = this.currentUASFlightPathFeature == undefined ? this.currentUASManeuverPointFeature : this.currentUASFlightPathFeature;
		// update feature properties 
		associatedUASFeature.setProperties({ "name": newUASName });
		this.featureLabelSetter(associatedUASFeature);
	}

	/**
	 * Method to update the custom emitter name from map
	 * @param {*integer} customEmitterIndex The custom emitter index to uniquely identify the custom emitter from the KVPs
	 * @param {*string} newCustomEmitterName The new Name for the custom emitter
	 */
	updateCustomEmitterName(customEmitterIndex, newCustomEmitterName) {
		let associatedCustomEmitterFeature = this.customEmitterFeatureDic.get(customEmitterIndex);
		// update feature properties 
		associatedCustomEmitterFeature.setProperties({ "name": newCustomEmitterName });
		this.featureLabelSetter(associatedCustomEmitterFeature);
	}

	/**
	 * Method to update the GCS feature from map
	 * @param {*string} latitude The latitude of the feature location
	 * @param {*string} longitude The longitude of the feature location
	 * @param {*string} heightFromGround The height from ground of the feature location
	 */
	async updateGCSFeatureLocation(latitude, longitude, heightFromGround) {
		let groundElevation = await this.retrieveLocationElevation(parseFloat(latitude), parseFloat(longitude));

		// default feature alt is the sea level plus gcs default height from ground
		let featureAlt = groundElevation + this.config.gcsDefaults.heightFromGround;

		// update feature properties 
		this.currentGCSFeature.setProperties({ "heightFromGround": parseFloat(heightFromGround), "groundElevation": parseFloat(groundElevation) });
		featureAlt = parseFloat(groundElevation) + parseFloat(heightFromGround);

		// update feature location
		this.currentGCSFeature.getGeometry().setCoordinates([parseFloat(longitude), parseFloat(latitude), parseFloat(featureAlt)]);

		// update emitter information if the emitter type is GCS
		if (this.emissionHeatmapAssetProp.emitterType == "GCS") {
			this.updatePointEmitterInfo(this.currentGCSFeature);
			// emit the emitter updated event
			this.emit("emitterUpdated", this.emissionHeatmapAssetProp);
		}
		// for height, use 2 decimal places 
		return featureAlt.toFixed(2);
	}

	/**
	 * Method to update the custom emitter feature from map
	 * @param {*string} customEmitterIndex the index of the custom emitter from the custom emitter dictionary
	 * @param {*string} latitude The latitude of the feature location
	 * @param {*string} longitude The longitude of the feature location
	 * @param {*string} heightFromGround The height from ground of the feature location
	 */
	async updateCustomEmitterFeatureLocation(customEmitterIndex, latitude, longitude, heightFromGround) {
		let groundElevation = await this.retrieveLocationElevation(parseFloat(latitude), parseFloat(longitude));

		// default feature alt is the sea level plus default height from ground
		let featureAlt = groundElevation + this.config.emitterDefaults.heightFromGround;

		// get the current custom emitter feature from feature dictionary
		let currentCustomEmitterFeature = this.customEmitterFeatureDic.get(customEmitterIndex);

		// update feature properties 
		currentCustomEmitterFeature.setProperties({ "heightFromGround": parseFloat(heightFromGround), "groundElevation": parseFloat(groundElevation) });
		featureAlt = parseFloat(groundElevation) + parseFloat(heightFromGround);

		// update feature location
		currentCustomEmitterFeature.getGeometry().setCoordinates([parseFloat(longitude), parseFloat(latitude), parseFloat(featureAlt)]);

		// for height, use 2 decimal places 
		return featureAlt.toFixed(2);
	}

	/**
	 * Method to update the POI feature from map
	 * @param {*string} latitude The latitude of the feature location
	 * @param {*string} longitude The longitude of the feature location
	 * @param {*string} heightFromGround The height from ground of the feature location
	 */
	async updatePOIFeatureLocation(latitude, longitude, heightFromGround) {
		let groundElevation = await this.retrieveLocationElevation(parseFloat(latitude), parseFloat(longitude));

		// default feature alt is the sea level plus poi default height from ground
		let featureAlt = groundElevation + this.config.poiDefaults.heightFromGround;

		// update feature properties 
		this.currentPOIFeature.setProperties({ "heightFromGround": parseFloat(heightFromGround), "groundElevation": parseFloat(groundElevation) });
		featureAlt = parseFloat(groundElevation) + parseFloat(heightFromGround);
		// update feature location
		this.currentPOIFeature.getGeometry().setCoordinates([parseFloat(longitude), parseFloat(latitude), parseFloat(featureAlt)]);
		// for height, use 2 decimal places 
		return featureAlt.toFixed(2);
	}

	/**
	 * remove the sensor feature from the map using the index
	 * @param {*integer} sensorIndex The sensor index to uniquely identify the sensor from the KVPs
	**/
	removeSensorFeature(sensorIndex) {
		let associatedSensorFeature = this.sensorFeatureDic.get(sensorIndex);
		this.sensorVectorLayer.getSource().removeFeature(associatedSensorFeature);
		this.sensorFeatureDic = this.reOrderMapFeatures(this.sensorFeatureDic, sensorIndex);
		this.emit("sensorRemoved", sensorIndex);
	}

	/**
	 * remove the GCS feature from the map using the index
	 * @param {*integer} gcsIndex The gcs index to uniquely identify the gcs from the KVPs
	**/
	removeGCSFeature(gcsIndex) {
		// right now there is only one GCS feature, just clear the map
		// need multiple GCS features handling in the future
		this.gcsVectorLayer.getSource().clear();
		this.currentGCSFeature = undefined;
		// clear the simulation emitter info
		if (this.emissionHeatmapAssetProp.emitterType == "GCS") this.clearSimulationEmitterInfo();
		this.emit("gcsRemoved", gcsIndex);
	}

	/**
	 * remove the UAS feature from the map using the index
	 * @param {*integer} uasIndex The uas index to uniquely identify the uas from the KVPs
	**/
	removeUASFeature(uasIndex) {
		// right now there is only one UAS feature, just clear the map
		// need multiple UAS features handling in the future
		this.uasVectorLayer.getSource().clear();
		this.uasManeuverVectorLayer.getSource().clear();
		this.currentUASFlightPathFeature = undefined;
		this.currentUASManeuverPointFeature = undefined;
		// clear the simulation emitter info
		if (this.emissionHeatmapAssetProp.emitterType == "UAS") this.clearSimulationEmitterInfo();
		this.emit("uasRemoved", uasIndex);
	}

	/**
	 * remove the POI feature from the map
	**/
	removePOIFeature() {
		// from the current design, there is only one POI feature, just clear the map
		this.poiVectorLayer.getSource().clear();
		this.currentPOIFeature = undefined;
		this.emit("poiRemoved");
	}

	/**
	 * remove the customEmitter feature from the map using the index
	 * @param {*integer} customEmitterIndex The customEmitter index to uniquely identify the customEmitter from the KVPs
	**/
	removeCustomEmitterFeature(customEmitterIndex) {
		let associatedCustomEmitterFeature = this.customEmitterFeatureDic.get(customEmitterIndex);
		this.customEmitterVectorLayer.getSource().removeFeature(associatedCustomEmitterFeature);
		this.customEmitterFeatureDic = this.reOrderMapFeatures(this.customEmitterFeatureDic, customEmitterIndex)
		this.emit("customEmitterRemoved", customEmitterIndex);
	}
	
	/**
	 *  remove and re-order the multiple feautres based on feature type
	 * @param {*string} featureDic The asset dictionary for the feature type 
	 * @param {*string} assetIndex The asset index to start the re-ordering
	 */
	reOrderMapFeatures(featureDic, assetindex){

		if(featureDic.size > 0) {
			// remove the feature from the dictronary using the index
			featureDic.delete(assetindex);
			// re-order the feature based on asset type and asset index
			// shift the feature index up by 1 by re-assigning the index
			let newSensorDic = new Map();
			let mapIterator = featureDic.values();
			let mapIteratorVal = mapIterator.next();
			let indexKey = 0;
			while (!mapIteratorVal.done) {
			  indexKey++;
			  newSensorDic.set(indexKey, mapIteratorVal.value);
			  // set the feature index
			  mapIteratorVal.value.setProperties({ "featureIndex": indexKey });
			  mapIteratorVal = mapIterator.next();
			}
			featureDic = newSensorDic;
		}
		return featureDic;
	}

	/**
	 * Method to load the Sensor feature to map
	 * @param {*string} sensorIndex The snesorIndex to uniquely identify the sensor
	 * @param {*string} name The name of the feature 
	 * @param {*string} latitude The latitude of the feature location
	 * @param {*string} longitude The longitude of the feature location
	 * @param {*string} altitude The altitude of the feature location
	 * @param {*string} heightFromGround The height from ground of the feature location
	 */
	loadSensorFeature(sensorIndex, name, latitude, longitude, altitude, heightFromGround) {
		// update feature properties 
		let newSensorFeature = new ol.Feature({
			name: name,
			featureIndex : sensorIndex,
			geometry: new ol.geom.Point([parseFloat(longitude), parseFloat(latitude), parseFloat(altitude)]),
			heightFromGround: parseFloat(heightFromGround),
			groundElevation: parseFloat(altitude) - parseFloat(heightFromGround)
		});
		// adding the new sensor the the sensor feature dictionary
		this.sensorFeatureDic.set(sensorIndex, newSensorFeature);

		// update the feature style
		newSensorFeature.setStyle(this.featureStyles.sensorStyle);

		// add feature to source
		this.sensorVectorLayer.getSource().addFeature(newSensorFeature);

		// emit sensor loaded event
		this.emit("sensorLoaded", sensorIndex, name);
	}

	/**
	 * Method to load the GCS feature to map
	 * @param {*string} name The name of the feature 
	 * @param {*string} latitude The latitude of the feature location
	 * @param {*string} longitude The longitude of the feature location
	 * @param {*string} altitude The longitude of the feature location
	 * @param {*string} heightFromGround The height from ground of the feature location
	 * @param {*boolean} gcsIsEmitter whether the GCS is an emitter or not
	 */
	loadGCSFeature(name, latitude, longitude, altitude, heightFromGround, gcsIsEmitter) {

		// update feature properties 
		this.currentGCSFeature = new ol.Feature({
			name: name,
			geometry: new ol.geom.Point([parseFloat(longitude), parseFloat(latitude), parseFloat(altitude)]),
			heightFromGround: parseFloat(heightFromGround),
			groundElevation: parseFloat(altitude) - parseFloat(heightFromGround)
		});

		// update the feature style
		if (gcsIsEmitter) {
			this.emissionHeatmapAssetProp.emitterType = "GCS";
			this.updatePointEmitterInfo(this.currentGCSFeature);
		}
		else {
			//Set the name and the style
			this.currentGCSFeature.setStyle(this.featureStyles.gcsStyle);
			this.featureLabelSetter(this.currentGCSFeature);
		}


		// add feature to source
		this.gcsVectorLayer.getSource().addFeature(this.currentGCSFeature);

		// emit gcs loaded event
		this.emit("gcsLoaded", 1, name);
	}

	/**
	 * Method to load the Custom Emitter feature to map
     * @param {*string} customEmitterIndex The snesorIndex to uniquely identify the sensor  
	 * @param {*string} name The name of the feature 
	 * @param {*string} latitude The latitude of the feature location
	 * @param {*string} longitude The longitude of the feature location
	 * @param {*string} altitude The longitude of the feature location
	 * @param {*string} heightFromGround The height from ground of the feature location
	 */
	loadCustomEmitterFeature(customEmitterIndex, name, latitude, longitude, altitude, heightFromGround) {
		// update feature properties 
		let newCustomEmitterFeature = new ol.Feature({
			name: name,
			featureIndex : customEmitterIndex,
			geometry: new ol.geom.Point([parseFloat(longitude), parseFloat(latitude), parseFloat(altitude)]),
			heightFromGround: parseFloat(heightFromGround),
			groundElevation: parseFloat(altitude) - parseFloat(heightFromGround)
		});

		// add the new custom emitter feature the the feature dictionary 
		this.customEmitterFeatureDic.set(customEmitterIndex, newCustomEmitterFeature)
		// update the feature style
		newCustomEmitterFeature.setStyle(this.featureStyles.customEmitterStyle);

		// add feature to source
		this.customEmitterVectorLayer.getSource().addFeature(newCustomEmitterFeature);

		// emit the customEmitter added event
		this.emit("customEmitterLoaded", customEmitterIndex, name);
	}

	/**
	 * Method to load the ISED Emitter feature to map
	 * @param {*array} latitudeArray The array for the multiple ISED emitters latitude 
	 * @param {*array} longitudeArray The array for the multiple ISED emitters longitude
	 * @param {*array} elevationArray The array for the multiple ISED emitters Elevation
	 * @param {*array} heightFromGroundArray The array for the multiple ISED emitters Height from ground
	 */
	loadISEDEmitterFeature(latitudeArray, longitudeArray, elevationArray, heightFromGroundArray) {
		
		// before loading, clear all the previous ISED emitter 
		this.clearIsedLayer();

		let currentISEDEmitterFeatureList = [];
		for (let index = 0; index < latitudeArray.length; index++) {
			const lat = latitudeArray[index];
			const long = longitudeArray[index];
			const elevation = elevationArray[index];
			const heightFromGround = heightFromGroundArray[index];
			const name = `ISED-${index+1}`;
			currentISEDEmitterFeatureList.push(
				new ol.Feature({
					geometry: new ol.geom.Point([parseFloat(long), parseFloat(lat), parseFloat(elevation) + parseFloat(heightFromGround)]),
					name: name,
					heightFromGround: parseFloat(heightFromGround),
					groundElevation: parseFloat(elevation)
			}))
		}

		// add feature to source
		this.isedEmitterVectorLayer.getSource().getSource().addFeatures(currentISEDEmitterFeatureList);
	}

	/**
	 * Method to load the POI feature to map
	 * @param {*string} name The name of the feature 
	 * @param {*string} latitude The latitude of the feature location
	 * @param {*string} longitude The longitude of the feature location
	 * @param {*string} altitude The longitude of the feature location
	 * @param {*string} heightFromGround The height from ground of the feature location
	 */
	loadPOIFeature(name, latitude, longitude, altitude, heightFromGround) {
		// update feature properties 
		this.currentPOIFeature = new ol.Feature({
			name: name,
			geometry: new ol.geom.Point([parseFloat(longitude), parseFloat(latitude), parseFloat(altitude)]),
			heightFromGround: parseFloat(heightFromGround),
			groundElevation: parseFloat(altitude) - parseFloat(heightFromGround)
		});
		// update the feature style
		this.currentPOIFeature.setStyle(this.featureStyles.poiStyle);
		//Set the name
		this.featureLabelSetter(this.currentPOIFeature);
		// add feature to source
		this.poiVectorLayer.getSource().addFeature(this.currentPOIFeature);
		
		this.emit("poiLoaded", 1, name);

	}

	/**
	 * Method to update the GCS feature from map
	 * @param {*string} latitude The latitude of the feature location
	 * @param {*string} longitude The longitude of the feature location
	 * @param {*string} heightFromGround The height from ground of the feature location
	 */
	async updateUASManeuverFeatureLocation(latitude, longitude, heightFromGround) {
		let groundElevation = await this.retrieveLocationElevation(parseFloat(latitude), parseFloat(longitude));

		// default feature alt is the sea level plus default uas height from ground
		let featureAlt = groundElevation + this.config.uasDefaults.heightFromGround;

		// update feature properties 
		this.currentUASManeuverPointFeature.setProperties({ "heightFromGround": parseFloat(heightFromGround), "groundElevation": parseFloat(groundElevation) });
		featureAlt = parseFloat(groundElevation) + parseFloat(heightFromGround);

		// update feature location
		this.currentUASManeuverPointFeature.getGeometry().setCoordinates([parseFloat(longitude), parseFloat(latitude), parseFloat(featureAlt)]);
		
		// update emitter information if the emitter type is UAS and is using maneuver
		if (this.emissionHeatmapAssetProp.emitterType == "UAS" && this.emissionHeatmapAssetProp.emitterIsUASManuver) {
			// update the feature icon color and set the label
			this.updatePointEmitterInfo(this.modifiedUASuasManeuverModifyFeature);
			this.emit("emitterUpdated", this.emissionHeatmapAssetProp);
		}
		// for height, use 2 decimal places 
		return featureAlt.toFixed(2);
	}

	/**
	 * Method to load the UAS line feature to map
	 * @param {*array} latArray The array for the multiple waypoints latitude
	 * @param {*array} longArray The array for the multiple waypoints longitude 
	 * @param {*array} altArray The array for the multiple waypoints altitude 
	 * @param {*array} hoverTimeArray The array for the multiple waypoints hovertime 
	 * @param {*array} flightSpeedArray The array for the multiple waypoints flight speed 
	 */
	async updateUASFlightPathFeatureLocation(latArray,longArray,altArray,hoverTimeArray,flightSpeedArray) {
		// destructuring the array
		let new2DTableArray = [[], [], [], [], [], []];
		let new2DElevationArray = [[]];
		let newUASWaypointsSeaLevelArray = [];
		let newUASWaypointsGroundLevelArray = [];

		// get all the current flight points coords
		let newFlightPathCoords = [];
		let errorInfo = {
			errorWithAlt: false,
			errorIndex: 0
		}
	
		// create a new set of coords based on the input table value 
		for (const index in latArray) {
			let latAtPoint = parseFloat(latArray[index]);
			let longAtPoint = parseFloat(longArray[index]);
			let altAtPoint = parseFloat(altArray[index]);
			let hoverTimeAtPoint = parseFloat(hoverTimeArray[index]);
			let flightSpeedAtPoint = parseFloat(flightSpeedArray[index]);

			// find the new SeaLevel and the Altitude 
			let groundElevation = await this.retrieveLocationElevation(latAtPoint, longAtPoint);

			// check to see if if the altitude above ground value is smaller than defaults, if not default to ground + uas default height
			if ((altAtPoint - groundElevation) < this.config.uasDefaults.heightLimit) {
				altAtPoint = groundElevation + this.config.uasDefaults.heightLimit;
				errorInfo.errorWithAlt = true;
				errorInfo.errorIndex = index;
			}

			// find ground height by alt - seaLevel height
			let heightFromGround = altAtPoint - groundElevation;
			newFlightPathCoords.push([longAtPoint, latAtPoint, altAtPoint]);
			newUASWaypointsSeaLevelArray.push(groundElevation);
			newUASWaypointsGroundLevelArray.push(heightFromGround);

			// new2DTableArray will be the table value to be applied for lat, long display 5 decimal places
			new2DTableArray[0].push(latAtPoint.toFixed(5));
			new2DTableArray[1].push(longAtPoint.toFixed(5));

			// for height display 2 decimal places
			new2DTableArray[2].push(altAtPoint.toFixed(2));
			new2DTableArray[3].push(heightFromGround.toFixed(2));
			new2DTableArray[4].push(hoverTimeAtPoint);
			new2DTableArray[5].push(flightSpeedAtPoint);

			new2DElevationArray[0].push(groundElevation.toFixed(2));
		}

		// update feature properties 
		this.currentUASFlightPathFeature.setProperties({ "uasWaypointsElevationArray": newUASWaypointsSeaLevelArray, "uasWaypointsGroundHeightArray": newUASWaypointsGroundLevelArray });

		// update the flight coords 
		this.currentUASFlightPathFeature.getGeometry().setCoordinates(newFlightPathCoords);

		if (this.emissionHeatmapAssetProp.emitterType == "UAS") {
			// update emitter information if the emitter type is UAS
			let {0:waypointsLatArray, 1:waypointsLongArray, 2:waypointsAltArray, 3:waypointsHeightArray} = new2DTableArray;
			this.updateUASEmitterInfo(waypointsLatArray,waypointsLongArray,waypointsAltArray,waypointsHeightArray, this.currentUASFlightPathFeature)
			// after the emitter is updated, emit the emitterUpdated event
			this.emit("emitterUpdated", this.emissionHeatmapAssetProp);
		}
		return [new2DTableArray, new2DElevationArray, errorInfo];
	};

	/**
	 * Method to find the emitter style for UAS flight path and update the emitter specs
	 * @param {*array} latArray The array for the multiple waypoints latitude
	 * @param {*array} longArray The array for the multiple waypoints longitude 
	 * @param {*array} altArray The array for the multiple waypoints altitude 
	 * @param {*array} heightArray The array for the multiple waypoints height 
	 * @param {*array} uasFeature The uas feature that contains the emitter 
	*/

	updateUASEmitterInfo(latArray, longArray, altArray, heightArray, uasFeature) {
		// update emitter information if the emitter type is UAS
		this.emissionHeatmapAssetProp.emitterLatitude = parseFloat(latArray[this.emissionHeatmapAssetProp.emitterUASIndex]);
		this.emissionHeatmapAssetProp.emitterLongitude = parseFloat(longArray[this.emissionHeatmapAssetProp.emitterUASIndex]);
		this.emissionHeatmapAssetProp.emitterAltitude = parseFloat(altArray[this.emissionHeatmapAssetProp.emitterUASIndex]);
		this.emissionHeatmapAssetProp.emitterHeightFromGround = parseFloat(heightArray[this.emissionHeatmapAssetProp.emitterUASIndex]);

		let emitterCoords = uasFeature.getGeometry().getCoordinates()[this.emissionHeatmapAssetProp.emitterUASIndex];
		// restyle and make sure the lable still there.
		this.styleFlightPath(uasFeature, new ol.style.Style({
			geometry: new ol.geom.Point(emitterCoords),
			image: new ol.style.Circle({
				radius: 5,
				fill: new ol.style.Fill({
					color: 'red',
				})
			})
		}));
		this.featureLabelSetter(this.currentUASFlightPathFeature);
	}

	/**
	 * Method to update the emitter information for point, it could be UAS maneuver or GCS
	 * @param {*olFeature} emitterFeature The emitter Feature
	*/
	updatePointEmitterInfo(emitterFeature) {
		// update emitter information if the emitter type is point
		this.emissionHeatmapAssetProp.emitterLatitude = emitterFeature.getGeometry().getCoordinates()[1];
		this.emissionHeatmapAssetProp.emitterLongitude = emitterFeature.getGeometry().getCoordinates()[0];
		this.emissionHeatmapAssetProp.emitterAltitude = emitterFeature.getGeometry().getCoordinates()[2];
		this.emissionHeatmapAssetProp.emitterHeightFromGround = emitterFeature.getProperties().heightFromGround;

		switch (this.emissionHeatmapAssetProp.emitterType) {
			case "UAS":
				emitterFeature.setStyle(this.featureStyles.uasManeuverSelectedStyle);
				break;
			case "GCS":
				emitterFeature.setStyle(this.featureStyles.gcsSelectedStyle);
				break;
			default:
				break;
		}
		// update the style of the GCS
		this.featureLabelSetter(emitterFeature);
	}

	/**
	 * Method to load the UAS Maneuver feature to map
	 * @param {*string} name The name of the feature 
	 * @param {*string} latitude The latitude of the feature location
	 * @param {*string} longitude The longitude of the feature location
	 * @param {*string} altitude The longitude of the feature location
	 * @param {*string} heightFromGround The height from ground of the feature location
	 * @param {*object} uasEmitterInfo The information of the emission heatmap emitter when it's UAS
	 */
	loadUASManeuverPointFeature(name, latitude, longitude, altitude, heightFromGround, uasEmitterInfo) {
		// update feature properties 
		this.currentUASManeuverPointFeature = new ol.Feature({
			name: name,
			geometry: new ol.geom.Point([parseFloat(longitude), parseFloat(latitude), parseFloat(altitude)]),
			heightFromGround: parseFloat(heightFromGround),
			groundElevation: parseFloat(altitude) - parseFloat(heightFromGround)
		});

		//Set the name and style
		this.currentUASManeuverPointFeature.setStyle(this.featureStyles.uasManeuverStyle);
		this.featureLabelSetter(this.currentUASManeuverPointFeature);

		// update the feature style
		if (uasEmitterInfo.uasIsEmitter) {
			this.emissionHeatmapAssetProp.emitterType = "UAS";
			this.emissionHeatmapAssetProp.emitterIsUASManuver = true;
			this.updatePointEmitterInfo(this.currentUASManeuverPointFeature);
		}
		else {
			//Set the name and style
			this.currentUASManeuverPointFeature.setStyle(this.featureStyles.uasManeuverStyle);
			this.featureLabelSetter(this.currentUASManeuverPointFeature);
		}

		// add feature to source
		this.uasManeuverVectorLayer.getSource().addFeature(this.currentUASManeuverPointFeature);

		// emit the event uas maneuver point loaded
		this.emit("uasPointLoaded", 1, name);
	}

	/**
	 * Method to update the line feature from map
	 * @param {*string} name The name of the UAS flight feature
	 * @param {*array} latArray The array for the multiple waypoints latitude
	 * @param {*array} longArray The array for the multiple waypoints longitude 
	 * @param {*array} altArray The array for the multiple waypoints altitude 
	 * @param {*array} heightArray The array for the multiple waypoints height 
	 * @param {*array} elevationArray The array for the multiple waypoints elevation 
	 * @param {*object} uasEmitterInfo The information of the emission heatmap emitter when it's UAS
	 */
	loadUASFlightPathFeature(name, latArray,longArray,altArray,heightArray, elevationArray, uasEmitterInfo) {
		// destructuring the array
		let newFlightPathCoords = [];

		for (let index = 0; index < latArray.length; index++) {
			let latAtPoint = parseFloat(latArray[index]);
			let longAtPoint = parseFloat(longArray[index]);
			let altAtPoint = parseFloat(altArray[index]);
			newFlightPathCoords.push([longAtPoint, latAtPoint, altAtPoint]);
		}
		// check to see of the elevation table is empty, reFind the elevation if needs.
		if (elevationArray.length === 1 && elevationArray[0] == '') {
			// remove the only place holder.
			elevationArray = [];
			for (let index = 0; index < latArray.length; index++) {
				let latAtPoint = parseFloat(latArray[index]);
				let longAtPoint = parseFloat(longArray[index]);
				let groundElevation = this.retrieveLocationElevation(latAtPoint, longAtPoint);
				elevationArray.push(groundElevation);
			}
		}

		this.currentUASFlightPathFeature = new ol.Feature({
			name: name,
			geometry: new ol.geom.LineString(newFlightPathCoords),
			uasWaypointsElevationArray: elevationArray,
			uasWaypointsGroundHeightArray: heightArray
		});

		this.styleFlightPath(this.currentUASFlightPathFeature);

		if(uasEmitterInfo.uasIsEmitter){
			this.emissionHeatmapAssetProp.emitterType = "UAS";
			this.emissionHeatmapAssetProp.emitterUASIndex = uasEmitterInfo.uasEmitterIndex;
			this.updateUASEmitterInfo(latArray,longArray,altArray,heightArray,this.currentUASFlightPathFeature);
		}

		//Set the name
		this.featureLabelSetter(this.currentUASFlightPathFeature);

		// add feature to source
		this.uasVectorLayer.getSource().addFeature(this.currentUASFlightPathFeature);

		// emit the event to notify the uas flight path is loaded
		this.emit("uasPathLoaded", 1, name);
	}

	/**
	 * Method to clean up all the draw events currently active 
	 */
	cleanDrawEvents() {
		if (this.sensorDraw != undefined) {
			this.map.removeInteraction(this.sensorDraw);
			this.sensorDraw = undefined;
		}
		if (this.gcsDraw != undefined) {
			this.map.removeInteraction(this.gcsDraw);
			this.gcsDraw = undefined;
		}
		if (this.poiDraw != undefined) {
			this.map.removeInteraction(this.poiDraw);
			this.poiDraw = undefined;
		}
		if (this.flightPathDraw != undefined) {
			this.map.removeInteraction(this.flightPathDraw);
			this.flightPathDraw = undefined;
		}
		if (this.uasManeuverPointDraw != undefined) {
			this.map.removeInteraction(this.uasManeuverPointDraw);
			this.uasManeuverPointDraw = undefined;
		}
		if (this.customEmitterDraw != undefined) {
			this.map.removeInteraction(this.customEmitterDraw);
			this.customEmitterDraw = undefined;
		}
	}

	/**
	 * Get the current bounding box of the view and add it to map as input/output bound
	 * * @param {*string} boundType The type of bound to be drawn 
	 */
	drawEngagementBound(boundType) {
		let extent = this.map.getView().calculateExtent(this.map.getSize());
		let LL_x = parseFloat(extent[0]);
		let LL_y = parseFloat(extent[1]);
		let UR_x = parseFloat(extent[2]);
		let UR_y = parseFloat(extent[3]);

		// feature created using the current bound
		let feat = new ol.Feature({ geometry: new ol.geom.Polygon([[[LL_x, LL_y], [UR_x, LL_y], [UR_x, UR_y], [LL_x, UR_y]]]) });

		// set the bound in range to be always true for now, later build need to add check for this
		let boundInRange = true;
		
		let allAssetsInRange = this.checkAssetsInRange(extent);

		if (boundType === "input" && allAssetsInRange && boundInRange) {
			// store the input extent
			this.currentInputExtent = extent;

			// remove the current features from the layer and add the new feature 
			this.inputBoundLayer.getSource().clear(true);
			this.inputBoundLayer.getSource().addFeature(feat);
		}

		else if (boundType === "output" && boundInRange) {
			// store the output extent when all 
			this.currentOutputExtent = extent;

			// remove the current features from the layer and add the new feature 
			this.outputBoundLayer.getSource().clear(true);
			this.outputBoundLayer.getSource().addFeature(feat);
		}
		return {
			assetsInRange: allAssetsInRange,
			boundInRange: boundInRange,
			boundBox: [LL_x, LL_y, UR_x, UR_y]
		}
	}

	//Jessy asked me to keep this function until we can figure out why it was
	//needed in the first place
	// Now it always returns true
	checkAssetsInRange(extent){
		return true;

		let poiInRange = false;
		let uasInRange = false;
		let gcsInRange = false;
		
		if (this.currentPOIFeature) poiInRange = ol.extent.containsCoordinate(gisConfig.defaultElevationFileExtent, this.currentPOIFeature.getGeometry().getCoordinates());

		// check all the assets
		if (this.currentUASFlightPathFeature) uasInRange = this.checkAssetsSpatialExtent(extent, this.currentUASFlightPathFeature);
		if (this.currentGCSFeature) gcsInRange = this.checkAssetsSpatialExtent(extent, this.currentGCSFeature);

		// assign the allAssetsInRange check value 
		let allAssetsInRange =  (uasInRange && gcsInRange && poiInRange);
		return allAssetsInRange;
		
	}

	/**
	 * Get the current input bounding box of the view and add it to map
	 * * @param {*array} inputBoundCoords The input bound coordinates 
	 */
	loadInputBound(inputBoundCoords) {
		// destructure the inputBoundCoords array and load the feature to map
		let [input_LL_y, input_LL_x, input_UR_y, input_UR_x] = inputBoundCoords;
		let inputBoundFeature = new ol.Feature({ geometry: new ol.geom.Polygon([[[input_LL_x, input_LL_y], [input_UR_x, input_LL_y], [input_UR_x, input_UR_y], [input_LL_x, input_UR_y]]]) });
		this.inputBoundLayer.getSource().addFeature(inputBoundFeature);
	}

	/**
	 * Get the current output bounding box of the view and add it to map
	 * * @param {*array} outputBoundCoords The output bound coordinates 
	 */
	loadOutputBound(outputBoundCoords) {
		// destructure the outputBoundCoords array and load the feature to map
		let [output_LL_y, output_LL_x, output_UR_y, output_UR_x] = outputBoundCoords;
		let outputBoundFeature = new ol.Feature({ geometry: new ol.geom.Polygon([[[output_LL_x, output_LL_y], [output_UR_x, output_LL_y], [output_UR_x, output_UR_y], [output_LL_x, output_UR_y]]]) });
		this.outputBoundLayer.getSource().addFeature(outputBoundFeature);
		// zoom to the extent of the output bound
		this.zoomToExtent(outputBoundCoords);
	}

	/**
	 * Zoom to the extent by finding the center lat/long
	 * @param {*array} extent The extent to zoom to
	*/
	zoomToExtent(extent) {
		let centerLat = (extent[0] + extent[2]) / 2;
		let centerLong = (extent[1] + extent[3]) / 2;
		this.map.getView().setCenter([centerLong, centerLat]);
	}

	/**
	 * Create the OSM file for model inputs
	 * * @param {*array} inputBounds The input coords for the extraction, array of string
	 * * @param {*string} inputFilePath The input master osm dataset path
	 * * @param {*string} outFileName The outputFileName
	 */
	async createOSMFile(inputBounds, inputFilePath, outFileName) {

		let inputCoords = `${inputBounds[0]},${inputBounds[1]},${inputBounds[2]},${inputBounds[3]}`
		let formID = this.engagementPageID;
		
		//find the solution path from this.config file
		let programPath = `${this.config.solutionLocation}Util\\osmconvert.exe`;
		let outputFilePath = `${this.config.solutionLocation}EnvironmentData\\temp\\${outFileName}`;
		let outputFolderPath = `${this.config.solutionLocation}EnvironmentData\\temp\\`;
		let osmconvertTempFilePath = `${this.config.solutionLocation}EnvironmentData\\temp\\tempfile`;

		// return a promise that handles OSM file extracted
		return new Promise((resolve, reject) => {
			// check to make sure the OSM convert file is there, if not reject
			if(!fs.existsSync(programPath)){
				logger.error(`Error finding the osmConvert program path: ${outputFolderPath}`);
				reject("Can't find the OSM convert program.");
			};

			// check to see if the input file exists, if not reject
			if (!fs.existsSync(inputFilePath)) {
				$(`${formID} #${VISUALIZER_LOADINGBAR_ID}`).hide();
				$(`${formID} #${VISUALIZER_DATACONTENT_ID}`).show();
				logger.error(`Error opening input OSM file: ${inputFilePath}`);
				reject("OSM database not found.");
			};

			// check to make sure the output path is there, if not, create in runtime
			if (!fs.existsSync(outputFolderPath)) {
				logger.error(`Error opening output OSM path: ${outputFolderPath}`);
				logger.info(`Creating the output OSM path: ${outputFolderPath}`);
				fs.mkdirSync(outputFolderPath, { recursive: true });
			}
			else {
				exec(`"${programPath}" "${inputFilePath}" -b=${inputCoords} -o="${outputFilePath}" -t="${osmconvertTempFilePath}"`, (error) => {
					$(`${formID} #${VISUALIZER_LOADINGBAR_ID}`).hide();
					$(`${formID} #${VISUALIZER_DATACONTENT_ID}`).show();
					if (error) {
						// if error, log and show notification
						logger.error(`OSM process error: ${error}`);
						reject("OSM extract process error.")
					}
					else {
						
						// when OSM creation succeeds emit the extracted signal and return the store path.
						this.emit("osmDataExtracted", outputFilePath)

						// force update to make sure the map is displayed properly.
						this.map.updateSize();

						// find the file size and convert it to mb
						let fileStats = fs.statSync(outputFilePath);
						let fileSizeInMegabytes = fileStats.size / (1024 * 1024);

						// warning if the file size is bigger than 50 mb, but still proceed with no error
						if (fileSizeInMegabytes > 50) modalDialog.notice("Warning!", `The OSM file size for the selected location is ${fileSizeInMegabytes.toFixed(2)} MB, which may result in a long processing time.`);
						logger.info("OSM Process is finished");
						resolve();
					}
				})
			}
		});

	}

	/**
	 * Create and publish DTED file to display from the GIS
	 * * @param {*string} terrainFileLocation The new terrain file location
	 */
	async addTerrainDataToMap(terrainFileLocation) {

		let terrainFileName = terrainFileLocation.replace(/^.*[\\\/]/, '').split(".")[0];
		let fileExtension = terrainFileLocation.replace(/^.*[\\\/]/, '').split(".")[1];

		// assign server location file path for dted data 
		let terrainFileServerLocation = `${this.config.geoserverConfig.localStoragePath}dted_data\\${terrainFileName}.tif`;
		let geoServerStoragePath = `file:dted_data/${terrainFileName}.tif`;

		// return a promise that handles DTED file move
		return new Promise((resolve, reject) => {
			if (!fs.existsSync(terrainFileLocation)) {
				reject("DTED file not found.");
			}
			else {
				let tempDTEDFilePath = `${this.config.solutionLocation}EnvironmentData\\temp\\temp_${terrainFileName}.${fileExtension}`;
				let tempGeoTifFilePath = `${this.config.solutionLocation}EnvironmentData\\temp\\temp_${terrainFileName}.tif`;

				// if the data already exist from the geoserver folder, then skip the convert and publish step.
				if(!fs.existsSync(terrainFileServerLocation)){
					fs.copyFileSync(terrainFileLocation, tempDTEDFilePath, fs.constants.COPYFILE_FICLONE);
					exec(`${this.config.solutionLocation}Util\\gdal\\gdalinfo.exe ${tempDTEDFilePath}`, async (error, stdout) => {
						if (error) {
							reject("Invalid DTED file type")
						}
						else {
							exec(`${this.config.solutionLocation}Util\\gdal\\gdal_translate.exe -of GTiff ${tempDTEDFilePath} ${tempGeoTifFilePath}`, async (error) => {
								if (error) {
									reject("DTED file conversion failed.")
								}
								else {
									try {
										// move converted geotif file to the geoserver store location
										fs.renameSync(tempGeoTifFilePath, terrainFileServerLocation);
										let publishResult = await this.publishNewDTEDLayer(geoServerStoragePath, terrainFileName);
			
										// if layer publish ok, solve the promise, else reject it
										if (publishResult) resolve();
										else {
											reject("DTED Layer publish error");
										}
									} catch (error) {
										reject("DTED file move error.");
									}
								}
							});
						}
					});
				}
				// if file already exists, just use it from the geoserver, as it should be published
				else {
					this.setDTEDMapLayer(terrainFileName, this.config.geoserverWorkspace);
					resolve();
				}
			}
		});

	}

		/**
	 * Create and publish DTED file to display from the GIS map
	 * * @param {*string} geoServerStoragePath The geoserver storage path for the file to be published
	 * * @param {*string} layerName The DTED layer name from geoserver  
	 */
	async publishNewDTEDLayer(geoServerStoragePath, layerName){
		
		// layer publish status 
		let publishSuccess = false;
		let storeCreationResult = await this.geoserver.createNewStore(geoServerStoragePath, layerName, this.config.geoserverWorkspace);
		if (storeCreationResult.status === 201 || storeCreationResult.status === 200) {
			logger.info(`DTED datastore:[${layerName}] successfully added.`);
			let layerCreationResult = await this.geoserver.publishLayer(layerName, layerName,  this.config.geoserverWorkspace);

			if (layerCreationResult.status === 201 || layerCreationResult.status === 200) {
				logger.info(`DTED:[${layerName}] has been successfully published.`);

				// set the new dted layer for the engagement.
				this.setDTEDMapLayer(layerName, this.config.geoserverWorkspace);
				publishSuccess = true;

			} else {
				logger.error(`DTED Layer:[${layerName}] issue with layer publishing.`);
				modalDialog.notice("DTED Layer Error", "Error with layer publishing, please check log for more details.");
			}
		} else {
			logger.error(`DTED Layer:[${layerName}] issue with datastore creation.`);
			modalDialog.notice("DTED Layer Error", "Error with layer datastore creation, please check log for more details.");
		}

		return publishSuccess;
	}

	/**
	 * Clear all the data layers from the map before reloading
	 */
	clearAllDataLayers() {
		this.sensorFeatureDic.clear();
		this.sensorVectorLayer.getSource().clear();

		this.gcsVectorLayer.getSource().clear();
		this.currentGCSFeature = undefined;

		this.uasVectorLayer.getSource().clear();
		this.currentUASFlightPathFeature = undefined;

		this.uasManeuverVectorLayer.getSource().clear();
		this.currentUASManeuverPointFeature = undefined;

		this.customEmitterFeatureDic.clear();
		this.customEmitterVectorLayer.getSource().clear();

		this.poiVectorLayer.getSource().clear();
		this.currentPOIFeature = undefined;

		this.inputBoundLayer.getSource().clear();
		this.currentInputExtent= undefined;
		this.outputBoundLayer.getSource().clear();
		this.currentOutputExtent = undefined;

		// isedEmitter might not need to be cleard from here
		// add below line to keep the function true to it's definition 
		this.isedEmitterVectorLayer.getSource().getSource().clear();
	}

	/**
	 * Clears the ised layer from the map
	 */
	clearIsedLayer(){
		this.isedEmitterVectorLayer.getSource().getSource().clear();
	}

	/**
	 * Clears the simultion emitter information
	 */
	clearSimulationEmitterInfo(){
		this.emissionHeatmapAssetProp = {
			emitterType: undefined,
			emitterLatitude: undefined,
			emitterLongitude: undefined,
			emitterAltitude: undefined,
			emitterHeightFromGround: undefined,
			emitterUASIndex: 0,
			emitterIsUASManuver: false
		};
		this.emit("emitterRemoved");
	}

	/**
	 * Create a WMS layer from the geoserver service
	 * * @param {*string} layerName The layer name from the geoserver
	 * * @param {*string} workSpaceName The input workspace name
	 * * @param {*double} layerOpacity The opacity of the layer to be added to the map
	 */
	addGeoServerWMSTileLayer(layerName, workSpaceName, layerOpacity) {

		let serverURL = this.geoserver.serverURL;
		// create a new WMS layer to be added to the map
		let wmsGeoserverLayer = new ol.layer.Tile({
			source: new ol.source.TileWMS({
				url: `${serverURL}wms`,
				params: { 'LAYERS': `${workSpaceName}:${layerName}`, 'TILED': true },
				serverType: 'geoserver',
				projection: "4326",
				transition: 0,
			}),
			opacity: layerOpacity
		})

		// add the new layer to the current map instance
		this.map.addLayer(wmsGeoserverLayer);

		return wmsGeoserverLayer;
	}

	/**
	 * Check input extents intersect with feature
	 * * @param {*string} extent The geometry extent from the map
	 * * @param {*string} assetFeature The asset feature from the map 
	 */
	checkAssetsSpatialExtent(extent, assetFeature) {
		return assetFeature.getGeometry().intersectsExtent(extent);
	}
}

module.exports = GISModel;