//Предварительная обработка оптической съёмки Sentinel-2
//Функция маскирования облаков и теней от облаков
function maskS2clouds(image) {  
    // Проверяем наличие полосы QA60
    if (image.bandNames().indexOf('QA60') == -1) {
      return null; // Возвращаем null, если полосы нет 
    }
    var qa = image.select('QA60');
  var cloudBitMask = 1 << 10;  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000);}
var dataset = ee.ImageCollection('COPERNICUS/S2_SR')
                  .filterDate('2022-05-01', '2024-10-23').filterBounds(table)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 90)).sort("CLOUDY_PIXEL_PERCENTAGE");

// Фильтруем изображения, у которых есть полоса QA60
dataset = dataset.filter(ee.Filter.listContains('system:band_names', 'QA60')); 

var S2SR_summer1_dataset = dataset.filterDate('2022-09-07', '2022-09-29');
var S2SR_summer2_dataset = dataset.filterDate('2023-01-13', '2023-01-19');
var S2SR_summer3_dataset = dataset.filterDate('2024-06-18', '2024-07-02');

var S2SR_winter1_dataset = dataset.filterDate('2022-09-07', '2022-09-29');
var S2SR_winter2_dataset = dataset.filterDate('2023-01-13', '2023-01-19');
var S2SR_winter3_dataset = dataset.filterDate('2024-06-18', '2024-07-02');

var S2SR_summer_dataset = S2SR_summer1_dataset.merge(S2SR_summer2_dataset).merge(S2SR_summer3_dataset);

var S2SR_winter_dataset = S2SR_winter1_dataset.merge(S2SR_winter2_dataset).merge(S2SR_winter3_dataset);

// print("Кол-во отобранных летних снимков: ", S2SR_summer_dataset.getInfo());
// print("Кол-во отобранных зимних снимков: ", S2SR_winter_dataset.getInfo());

var S2SR_summer_mosaic = S2SR_summer_dataset 
        .map(maskS2clouds).select('B4', 'B8', 'B11', 'B12')
        .reduce(ee.Reducer.percentile([50]))         .clip(table);
       var S2SR_winter_mosaic = S2SR_winter_dataset
        .map(maskS2clouds).select('B4', 'B8', 'B11', 'B12')
        .reduce(ee.Reducer.percentile([50]))         .clip(table);

var S2SR_mosaic = S2SR_summer_mosaic.addBands(S2SR_winter_mosaic).clip(table);var bands = ['B4_p50','B8_p50', 'B11_p50','B12_p50','B4_p50_1','B8_p50_1','B11_p50_1','B12_p50_1'];
var rgbVis = {
  min: [0.0631, 0.1448, 0.0247],  max: [0.3334, 0.3495, 0.7151],
  bands: ['B11_p50', 'B8_p50', 'B4_p50'],
};

Map.addLayer(S2SR_summer_mosaic, rgbVis, 'Sentinel2summer', true);Map.addLayer(S2SR_winter_mosaic, rgbVis, 'Sentinel2winter', true);
Export.image.toDrive({
  "image": S2SR_summer_mosaic, "description": 'mosaicSummer', 
  "folder": 'mosaicSummer', "fileNamePrefix": 'mosaicSummer', 
  "region": table, "scale": 20, 
  "crs": 'EPSG:4326', "maxPixels": 1e13, 
  "shardSize": 512, "fileFormat": 'GeoTIFF'
  });

Export.image.toDrive({  "image": S2SR_winter_mosaic, 
  "description": 'mosaicWinter',   "folder": 'mosaicWinter', 
  "fileNamePrefix": 'mosaicWinter',   "region": table, 
  "scale": 20,   "crs": 'EPSG:4326', 
  "maxPixels": 1e13,   "shardSize": 512, 
  "fileFormat": 'GeoTIFF'});

Export.image.toDrive({
  "image": S2SR_mosaic, "description": 'mosaic', 
  "folder": 'mosaic', "fileNamePrefix": 'mosaic', 
  "region": table, 
  "scale": 20, "crs": 'EPSG:4326', 
  "maxPixels": 1e13,"shardSize": 512, 
  "fileFormat": 'GeoTIFF'});
