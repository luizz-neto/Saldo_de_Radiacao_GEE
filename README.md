# 🌍 Processamento de Imagens Landsat no Google Earth Engine  

Este repositório contém um script em **Google Earth Engine (JavaScript API)** que realiza o pré-processamento e cálculo de variáveis biofísicas e de balanço de energia a partir de imagens do **Landsat 8 (Coleção 2, Nível 2)**.  

O código foi desenvolvido para análises ambientais, agrícolas e hidrológicas, com foco em estimar parâmetros como **albedo, NDVI, SAVI, IAF, emissividade, temperatura da superfície e radiação líquida (Rn)**.  

---

## ⚙️ Etapas principais do script
1. **Seleção de imagens Landsat 8**  
   - Filtra pela área de interesse (`poligono`)
   - Período de análise: `YYYY-MM-DD'
   - Imagens com cobertura de nuvens inferior a **5%**  

2. **Correções radiométricas**  
   - Conversão das bandas de reflectância (`SR_B1` a `SR_B7`)  
   - Conversão da banda termal (`ST_B10`)  

3. **Cálculo do Albedo**  
   - Usando fatores de ponderação aplicados às bandas de reflectância  

4. **Índices de Vegetação**  
   - **NDVI** (Normalized Difference Vegetation Index)  
   - **SAVI** (Soil Adjusted Vegetation Index)  

5. **Cálculo do IAF (Índice de Área Foliar)**  
   - Derivado do SAVI, com correções para limites inferiores e superiores  

6. **Emissividade**  
   - Emissividade estreita (ENB)  
   - Emissividade de banda larga (e₀ e e_nb)  

7. **Temperatura da Superfície**  
   - Temperatura em **Celsius** (`temp`)  
   - Temperatura em **Kelvin** (`tempk`)  

8. **Fluxos Radiativos**  
   - **ROL** → Radiação de Onda Longa emitida pela superfície  
   - **RLatm** → Radiação de Onda Longa Atmosférica  
   - **RSdown** → Radiação de onda curta incidente  

9. **Radiação Líquida (Rn)**  
   - Calculada a partir do balanço radiativo:  

   \[
   Rn = (1 - \alpha) RS↓ + RL↓ - RL↑ - (1 - \varepsilon) RL↓
   \]  

10. **Visualização no mapa (Map Layers)**  
    - Composição RGB natural (bandas 4-3-2)  
    - Mapas de albedo, NDVI, SAVI, IAF, emissividade, temperatura e fluxos radiativos  

---

## 📊 Variáveis de saída
| Variável        | Descrição                                      |
|-----------------|------------------------------------------------|
| `albedo_toa`    | Albedo no topo da atmosfera                    |
| `calculo_ndvi`  | NDVI (Normalized Difference Vegetation Index)  |
| `calculo_savi`  | SAVI (Soil Adjusted Vegetation Index)          |
| `IAF`           | Índice de Área Foliar                          |
| `ENB`           | Emissividade estreita                          |
| `e_nb` / `e0`   | Emissividade de banda larga                    |
| `temp`          | Temperatura da superfície (°C)                 |
| `tempk`         | Temperatura da superfície (Kelvin)             |
| `ROL`           | Radiação de onda longa emitida                 |
| `RSdown`        | Radiação de onda curta incidente               |
| `RLatm`         | Radiação de onda longa atmosférica             |
| `rn`            | Radiação líquida (saldo de radiação)           |

---

## 🎯 Aplicações
- Estudos de **balanço de energia e evapotranspiração** (SEBAL, METRIC, etc.)  
- Monitoramento de **agricultura irrigada**  
- Modelagem de **processos hidrológicos**  
- Análises de **uso e cobertura da terra**  

---

## 🛠️ Tecnologias utilizadas
- [Google Earth Engine](https://earthengine.google.com/) (API JavaScript)  
- Dados do **Landsat 8 Collection 2 Level 2**  
- Modelo digital de elevação **SRTM (CGIAR/SRTM90_V4)**  

---
