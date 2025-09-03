/*
Luiz Soares Neto
Instituto de Ciências Atmosfércas - UFAL
luizsneto211@gmail.com
luiz.neto@icat.ufal.br
Last updated on September 03, 2025
*/
Map.centerObject(poligono, 10);

var palette = ['#000000', '#666666', '#ffffff', '#ff0000'];
var seinao = ['FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
               '74A901', '66A000', '529400', '3E8601', '207401', '056201',
               '004C00', '023B01', '012E01', '011D01', '011301']
               
var palette_temp = [
  '#000080', '#0000D9', '#4000FF', '#8000FF', '#0080FF', '#00FFFF', '#00FF80',
  '#80FF00', '#DAFF00', '#FFFF00', '#FFF500', '#FFDA00', '#FFB000', '#FFA400',
  '#FF4F00', '#FF2500', '#FF0A00']

var palette_rol = ['blue', 'cyan', 'green', 'yellow', 'red']
  
var collection = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
  .filterBounds(poligono)
  .filter(ee.Filter.lt('CLOUD_COVER', 5))
  .filterDate('2015-04-01', '2015-09-30')
  .sort('CLOUDY_PIXEL_PERCENTAGE');

print("Quantidade de imagens na coleção:", collection.size());

function reflectancia(image) {
  var banda1 = image.select("SR_B1").multiply(0.0000275).add(-0.2);
  var banda2 = image.select("SR_B2").multiply(0.0000275).add(-0.2);
  var banda3 = image.select("SR_B3").multiply(0.0000275).add(-0.2);
  var banda4 = image.select("SR_B4").multiply(0.0000275).add(-0.2);
  var banda5 = image.select("SR_B5").multiply(0.0000275).add(-0.2);
  var banda6 = image.select("SR_B6").multiply(0.0000275).add(-0.2);
  var banda7 = image.select("SR_B7").multiply(0.0000275).add(-0.2);
  var thermalBands = image.select("ST_B10").multiply(0.00341802).add(149.0);
//////////////////////////////////////////////////////////////////////// -> ate aqui é reflectancia
//acrecentei o albedo logo aqui, aparentemente deu certo, da uma olhada ae nas imagens 
  var albedo = banda2.multiply(0.2453) //-> fatores de correção para cada bandacalculados no excel
                     .add(banda3.multiply(0.0508)) //O .multiply vai dentro da função, aplicando a cada banda
                     .add(banda4.multiply(0.1804))
                     .add(banda5.multiply(0.142641))
                     .add(banda6.multiply(0.1332))
                     .add(banda7.multiply(0.0521)).rename("albedo_toa")
                     

  return image
    .addBands(banda1, null, true)
    .addBands(banda2, null, true)
    .addBands(banda3, null, true)
    .addBands(banda4, null, true)
    .addBands(banda5, null, true)
    .addBands(banda6, null, true)
    .addBands(banda7, null, true)
    .addBands(thermalBands, null, true)
    .addBands(albedo) //Aqui não tem o null true, a banda de albedo não existe
                      //para ser substituída, é uma banda nova
    .set({ date: image.date().format('YYYY-MM-dd') });
}

var coll_ref = collection.map(reflectancia);



var elevation = ee.Image('CGIAR/SRTM90_V4').clip (poligono)


/*function albedosup (image) {
  var albedotoa = image.select("albedo_toa")
  var ts = elevation.multiply(0.00002).add(0.75);
  var ts2 = ts.multiply(ts);
  var path = ee.Number (0.03)
  var alb = albedotoa.subtract(path)
  var albsup = alb.divide(ts2).rename("albedo_sup")

  return image
    .addBands(albsup)
    .set({ date: image.date().format('YYYY-MM-dd') });
}
var coll_alb = coll_ref.map(albedosup);
print(coll_alb)*/


//Calculando NDVI

function calculondvi(image) {
  var banda4 = image.select("SR_B4")
  var banda5 = image.select("SR_B5")
  var subtracao = banda5.subtract(banda4)
  var soma = banda5.add(banda4)
  var ndvi = subtracao.divide(soma).rename("calculo_ndvi")
  //var ndvi1 = image.normalizedDifference (["SR_B5", "SR_B4"]).rename("calculo_ndvi")
  
  return image
    .addBands(ndvi)
    .set({ date: image.date().format('YYYY-MM-dd') });
}

var coll_ndvi = coll_ref.map(calculondvi);



//Calcaulando o SAVI


function calculosavi(image) {
   var banda5 = image.select("SR_B5")
   var banda4 = image.select("SR_B4")
   var L = ee.Image.constant(0.1)
   var L1 = ee.Image.constant(1.1)
   var subtracao = banda5.subtract(banda4);
   var Lb = L.add(banda5).add(banda4);
   var parte1 = L1.multiply(subtracao);
 var savi = parte1.divide(Lb).rename("calculo_savi")
   
   return image
   .addBands(savi)
   .set({ date: image.date().format('YYYY-MM-dd') });
   
}

var coll_savi = coll_ndvi.map(calculosavi)


//Calculo IAF

var calculoIAF = function(image) {
  var savi = image.select('calculo_savi');
  var iaf = savi.where(savi.lt(0.688000), //lt olhar no doc
  savi.expression(
    '(log((0.69 - savi) / 0.59)) * (-1) / 0.91',
    {'savi': savi.select('calculo_savi'),}));
  var iaf2 = iaf.where(savi.gt(0.688000), 6);
  var iafcorrigido = iaf2.where(savi.lt(0.000001), 0).rename('IAF');
  
  
  return image.addBands(iafcorrigido)
              .copyProperties(image, image.propertyNames())
              .set({data: image.date().format('YYYY-MM-dd')});
};

var coll_iaf = coll_savi.map(calculoIAF)


// Calculo Emissividade
var calculoENB = function(image) {
  var iaf = image.select("IAF");
  var enb = iaf.where(iaf.lt(3),
  iaf.expression(
    "0.97 + 0.0033 * iaf",
    {"iaf" : iaf.select("IAF"),}))
  var enb2 = enb.where(iaf.gte(3), 0.98);
  var enbfinal = enb2.where(iaf.lt(0.0000000001), 0.99).rename("ENB")
  
   return image.addBands(enbfinal)
              .copyProperties(image, image.propertyNames())
              .set({data: image.date().format('YYYY-MM-dd')});
};

var coll_enb = coll_iaf.map(calculoENB)

//Calculo emissividade banda larga

 function emissividade(image) {
  var iaf = image.select("IAF");
  var n1 = ee.Number(0.0033)
  var calculo1 = iaf.multiply(n1)
  var n2 = ee.Number(0.01)
  var calculo2 = iaf.multiply(n2)
  var enb1 = image.expression(
   '(0.97+LAI03)',
    {
    'LAI03':calculo1
    })
  var enb = enb1.where(iaf.gt(2.999999), 0.98)
  var enb2 =  enb.where(iaf.lt(0.000001), 0.99).rename('e_nb');
  var e0 = image.expression(
    '(0.95+LAI01)',
    {
    'LAI01':calculo2
    })
    .rename('e0');
    
   return image.addBands(enb2)
                .addBands(e0)
              .copyProperties(image, image.propertyNames())
              .set({data: image.date().format('YYYY-MM-dd')});
}

var coll_ebl = coll_enb.map(emissividade)

//Calculo Temperatura em celsiu

function tempsurf (image) {
  var l = image.select("ST_TRAD").multiply(0.001)
  var k1 = ee.Image.constant (774.89)
  var k2 = ee.Image.constant (1321.08)
  var uni = ee.Image.constant (1)
  var enb = image.select("ENB")
  var cal1 = (enb.multiply(k1))
  var cal2 = cal1.divide (l)
  var cal3 = cal2.add (uni)
  var cal4 = cal3.log()
  var cal5 = k2.divide(cal4)
  var cal6 = cal5.subtract(273.15).rename("temp") 
  
   return image.addBands(cal6)
              .copyProperties(image, image.propertyNames())
              .set({data: image.date().format('YYYY-MM-dd')});
}
 var coll_tempsurf = coll_ebl.map(tempsurf)

//Caculo da temperatura em kelwin
function tempk (image) {
  var l = image.select("ST_TRAD").multiply(0.001)
  var k1 = ee.Image.constant (774.89)
  var k2 = ee.Image.constant (1321.08)
  var uni = ee.Image.constant (1)
  var enb = image.select("ENB")
  var cal1 = (enb.multiply(k1))
  var cal2 = cal1.divide (l)
  var cal3 = cal2.add (uni)
  var cal4 = cal3.log()
  var final = k2.divide(cal4).rename("tempk") 
  
   return image.addBands(final)
              .copyProperties(image, image.propertyNames())
              .set({data: image.date().format('YYYY-MM-dd')});
}
 var coll_tempk = coll_tempsurf.map(tempk)
  
//Calculo da Radiação de onda longa
function ROL (image) {
  var e0 = image.select("e0")
  var temp = image.select("tempk")
  var boltzman = ee.Image.constant (0.0000000567)
  var temp4 = temp.pow(4)
  var cal1 = e0.multiply(temp4)
  var rolfinal = cal1.multiply(boltzman).rename("ROL")
  
  return image.addBands(rolfinal)
              .copyProperties(image, image.propertyNames())
              .set({data: image.date().format('YYYY-MM-dd')});
}
var coll_rol = coll_tempk.map(ROL)///// ATE AQUI ESTA TUDO CORRETO, COM VALORES COERENTES//////////




//Calculo SHORTWAVE RADIATION (Incidente) ->> VALORES CORRIGIDOS 

function RS_INC (image) {
 var tsw = image.select("ST_ATRAN")
 var decimal = ee.Image.constant(0.0001)
 var tsw_corrigida = tsw.multiply(decimal)
  var elevacao = image.getNumber('SUN_ELEVATION');
  var dt_s = image.getNumber('EARTH_SUN_DISTANCE');
  var cos_z = ee.Number(elevacao).multiply(3.14).divide(180).sin();
  var gsc = ee.Number(1367);
  var dr = ee.Number(1).divide((ee.Number(dt_s)).pow(2));
  var termo1 = gsc.multiply(cos_z);
  var termo2 = tsw_corrigida.multiply(dr);//.multiply(-1);
  // Multiplicação da constante Gsc por cada banda da imagem
  var RSdown = image.expression(
    'termo2*termo1', {
      "termo1": termo1,
      "termo2": termo2
    }).rename('RSdown');



    
  
  return image.addBands(RSdown)
    .copyProperties(image, image.propertyNames())
    .set({ data: image.date().format('YYYY-MM-dd') });
}
var coll_inc = coll_rol.map(RS_INC)



//////////////VALORES DANDO ZERO CORRIGIR//////////////

//εa = 0.85 × (-ln τsw)^0.09
function RLatm(image){
  var stefBoltzman = ee.Number(0.0000000567);
  var temperatura = image.select('tempk').pow(4);
  var tsw = image.select("ST_ATRAN");
  var decimal = ee.Image.constant(0.0001)
  var tsw_corri = tsw.multiply(decimal)
  // Calcule a expressão
  var resultado = image.expression('(-log(tsw_corri))', {
    'tsw_corri': tsw_corri
  });
  var result = resultado.pow(0.09);
  var el1 = ee.Number(0.85);
  var el2 = result.multiply(el1);
  //var c = ee.Number(88);
  var e_a = el2.multiply(stefBoltzman);
  var RLdown = image.expression(
    'e_a*temp4',{
      'e_a':e_a,
      'temp4':temperatura
    }).rename('RLatm');
  
  return image.addBands(RLdown)
    .copyProperties(image, image.propertyNames())
    .set({ data: image.date().format('YYYY-MM-dd') });
}
var coll_comp = coll_inc.map(RLatm)

//////RN FINALMENTE POURRA////////

function rn(image) {
  var albedo = image.select('albedo_toa')
  var emiss_larga = image. select('e_nb')
  var Rs = image.select('RSdown')
  var Rol = image.select('ROL')
  var Rol_atm = image.select('RLatm')
  var uni = ee.Image.constant(1)
  ///Primeira parte do calculo/////
  var cal1 = uni.subtract(albedo)//(1 - α)
  var cal2 = cal1.multiply(Rs)
  ////////////////////////////////////////
  ////Segunda parte do calculo//////
  var cal3 = Rol_atm.subtract(Rol)
  ///////////////////////////////////////
  ////Terceira parte do calculo
  var cal4 = uni.subtract(emiss_larga)
  var cal5 = cal4.multiply(Rol_atm)
  //////////////////////////////////////
  ////Quarta e ultima parte do calculo////
  var cal6 = cal2.add(cal3)
  var cal7 = cal6.subtract(cal5).rename('rn');
  
   return image.addBands(cal7)
    .copyProperties(image, image.propertyNames())
    .set({ data: image.date().format('YYYY-MM-dd') });
}
var coll_rn = coll_comp.map(rn)
print (coll_rn)
  
  
  
  ///////////////////////////////////////////////////////////////////
  /*var cal1 = uni.subtract(albedo)//(1 - α)
  print (cal1)
  var cal2 = cal1.multiply(Rs)//(1 - α) RS↓
  var cal3 = cal2.add(Rol).
  var cal4 = Rol_atm.subtract(cal3)//(1 - α) RS↓ + RL↓ - RL↑
  ///Segunda parte
  var cal5 = emiss_larga.subtract(uni)// -(1-εo)
  var cal6 = cal5.multiply(Rol)//-(1-εo)RL↓
  var cal7 = cal6.subtract(cal4).rename('Rn');//Rn = (1 - α) RS↓ + RL↓ - RL↑ - (1-εo)RL↓
  
    return image.addBands(cal6)
    .copyProperties(image, image.propertyNames())
    .set({ data: image.date().format('YYYY-MM-dd') });
}
var coll_rn = coll_comp.map(rn)*/


var tratada = coll_rn.sort('CLOUD_COVER').first().clip(poligono);



Map.addLayer(tratada, { bands: ['SR_B4', 'SR_B3', 'SR_B2'], min: 0.00789999999999999, max: 0.07073750000000001 }, 'RGB')
Map.addLayer(tratada, { bands: ['albedo_toa'], min: 0.017372577895, max: 0.27368406118, palette: palette }, 'Albedo Sup');
Map.addLayer(tratada, { bands: ['calculo_ndvi'], min:0, max: 1, palette: seinao  }, 'NDVI');
Map.addLayer(tratada, { bands: ['calculo_savi'], min: -0.22980646617389822, max: 0.16321759734323396, palette: seinao  }, 'SAVI');
Map.addLayer(tratada, { bands: ['IAF'], min: -0.1718791645435255, max: 0.1182068656382173, palette: seinao  }, 'IAF');
Map.addLayer(tratada, { bands: ['ENB'], min: 0, max: 0.9704109949527133, palette: seinao  }, 'ENB');
Map.addLayer(tratada, { bands: ['temp'], min: 23.459955006846656, max: 41.47485269083404, palette: palette_temp }, 'Temp Surface');
Map.addLayer(tratada, { bands: ['tempk'], min: 293.2441865819591, max: 315.52954904274446, palette: palette_temp }, 'Temp Surface Kelwin');
Map.addLayer(tratada, { bands: ['ST_TRAD'], min: 0, max: 0.9704109949527133, palette: palette_temp  }, 'Radiancia');
Map.addLayer(tratada, { bands: ['ROL'], min: 411.9198421241714, max: 526.7091204447202, palette: palette_rol }, 'ROL');
Map.addLayer(tratada, { bands: ['RSdown'], min: 865.8345580202359, max: 922.4735383558449, palette: palette_rol }, 'RSdown');
Map.addLayer(tratada, { bands: ['RLatm'], min: 327.84394821887025, max: 415.5372452855257, palette: palette_rol }, 'RLatm');
Map.addLayer(tratada, { bands: ['rn'], min: 595.444841035158, max: 811.2241960711716, palette: palette_rol }, 'Rn');
