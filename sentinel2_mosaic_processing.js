///////////////////////Предварительная обработка оптической съёмки Sentinel-2////////////////////////
//Функция маскирования облаков и теней от облаков
function maskS2clouds(image) {
    var qa = image.select('QA60');
    var cloudBitMask = 1 << 10;
    var cirrusBitMask = 1 << 11;
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
        .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
    return image.updateMask(mask);//.divide(10000);
  }
  
  //Загрузка данных Sentinel-2 уровня обработки 2А (Surface Reflecance)
  var dataset = ee.ImageCollection('COPERNICUS/S2_SR')
                    .filterDate('2020-05-01', '2023-02-07')//фильтрация снимков по дате съёмки
                    .filterBounds(table)//фильтрация снимков по области интереса
                    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 90))//фильтрация снимков по облачности
                    .sort("CLOUDY_PIXEL_PERCENTAGE");//сортировка сцен по возрастанию облачности
  
  //Применение маскирования к отфильтрованному набору снимков и агрегирования (усреднение по яркости) за выбранный период
  var S2SR_summer1_dataset = dataset.filterDate('2020-05-01', '2020-09-30');
  var S2SR_summer2_dataset = dataset.filterDate('2021-05-01', '2021-09-30');
  var S2SR_summer3_dataset = dataset.filterDate('2022-05-01', '2022-09-30');
  
  var S2SR_winter1_dataset = dataset.filterDate('2020-10-01', '2021-03-31');
  var S2SR_winter2_dataset = dataset.filterDate('2021-10-01', '2022-03-31');
  var S2SR_winter3_dataset = dataset.filterDate('2022-10-01', '2023-02-07');
  
  var S2SR_summer_dataset = S2SR_summer1_dataset.merge(S2SR_summer2_dataset).merge(S2SR_summer3_dataset);
  var S2SR_winter_dataset = S2SR_winter1_dataset.merge(S2SR_winter2_dataset).merge(S2SR_winter3_dataset);
  
  //print("Кол-во отобранных летних снимков: ", S2SR_summer_dataset.getInfo());
  //print("Кол-во отобранных зимних снимков: ", S2SR_winter_dataset.getInfo());
  
  /////////////////Создание усреднённой летней безоблачной мозаики за три года////////////////////////
  var S2SR_summer_mosaic = S2SR_summer_dataset 
          .filterDate('2020-05-01', '2022-09-30')
          .map(maskS2clouds)//применение маски облаков
          .select('B2','B3','B4','B5','B8','B11','B12')
          .reduce(ee.Reducer.percentile([50])) //То же что и функция median() 
          .clip(table)//образка мозаики по границам области интереса
          .uint16();
  
  /////////////////Создание усреднённой зимней безоблачной мозаики за три года////////////////////////        
  var S2SR_winter_mosaic = S2SR_winter_dataset
          .filterDate('2020-10-01', '2023-02-07')
          .map(maskS2clouds)//применение маски облаков
          .select('B2','B3','B4','B5','B8','B11','B12')
          .reduce(ee.Reducer.percentile([50])) //То же что и функция median()
          .clip(table)//образка мозаики по границам области интереса
          .uint16();
  
  //Создание объединенной двухсезонной мозаики
  var S2SR_mosaic = S2SR_summer_mosaic.addBands(S2SR_winter_mosaic).clip(table);
  var bands = ['B2_p50','B3_p50','B4_p50','B5_p50','B8_p50','B11_p50','B12_p50','B2_p50_1','B3_p50_1','B4_p50_1','B5_p50_1','B8_p50_1','B11_p50_1','B12_p50_1'];
  
  //Просмотр сформированной бесшовной безоблачной мозаики 
  var rgbVis = {
    min: [0631, 1448, 0247],
    max: [3334, 3495, 7151],
    bands: ['B11_p50', 'B8_p50', 'B4_p50'],
  };//Параметры визуализаци
  
  ////////////////////////Визуализация сформированной безоблачной мозаики/////////////////////
  //Map.centerObject(geometry, 10);//Центрирование карты
  Map.addLayer(S2SR_summer_mosaic, rgbVis, 'Sentinel2summer', true);
  Map.addLayer(S2SR_winter_mosaic, rgbVis, 'Sentinel2winter', true);
  
  //////////////////////////Экспорт летней мозаики на Google диск////////////////////////////
  Export.image.toDrive({
    "image": S2SR_summer_mosaic, 
    "description": 'mosaicSummer', 
    "folder": 'mosaicSummer', 
    "fileNamePrefix": 'mosaicSummer', 
    "region": table, 
    "scale": 20, 
    "crs": 'EPSG:4326', 
    "maxPixels": 1e13, 
    "shardSize": 1024, 
    "fileFormat": 'GeoTIFF'
    });
    
  //////////////////////////Экспорт зимней мозаики на Google диск////////////////////////////
  Export.image.toDrive({
    "image": S2SR_winter_mosaic, 
    "description": 'mosaicWinter', 
    "folder": 'mosaicWinter', 
    "fileNamePrefix": 'mosaicWinter', 
    "region": table, 
    "scale": 20, 
    "crs": 'EPSG:4326', 
    "maxPixels": 1e13, 
    "shardSize": 1024, 
    "fileFormat": 'GeoTIFF'
    });