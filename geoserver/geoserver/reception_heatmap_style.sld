<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>heatmap</Name>
    <UserStyle>
      <Name>heatmap</Name>
      <Title>Simple heatmap style</Title>
      <Abstract>heatmap color progression</Abstract>
      <FeatureTypeStyle>
        <Rule>
          <RasterSymbolizer>
            <Opacity>1.0</Opacity>
            <ColorMap>
              <ColorMapEntry color="#a50026" quantity="0" label="  0"/>
              <ColorMapEntry color="#d73027" quantity="0.1" label=" 10%"/>
              <ColorMapEntry color="#f46d43" quantity="0.2" label=" 20%"/>
              <ColorMapEntry color="#fdae61" quantity="0.3" label=" 30%"/>
              <ColorMapEntry color="#fee08b" quantity="0.4" label=" 40%"/>
              <ColorMapEntry color="#ffffbf" quantity="0.5" label=" 50%"/>
              <ColorMapEntry color="#d9ef8b" quantity="0.6" label=" 60%"/>
              <ColorMapEntry color="#a6d96a" quantity="0.7" label=" 70%"/>
              <ColorMapEntry color="#66bd63" quantity="0.8" label=" 80%"/>
              <ColorMapEntry color="#1a9850" quantity="0.9" label=" 90%"/>
              <ColorMapEntry color="#006837" quantity="1" label=" 100%"/>
            </ColorMap>
          </RasterSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>