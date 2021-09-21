var path = require("path");
const { documentExtract } = require("../utils.js");

const readPaymentgSupport = (filePath, isRequest = false) =>
  new Promise((resolve, reject) => {
    try {
      let ext = path.extname(filePath);

      let arrayTextLine = [];

      /**
       * Json de resultado
       */
      let resultArray = [];

      /**
       * Left de devengos
       */
      let leftEarns = 0;

      /**
       * Left de descuentos
       */
      let leftDiscounts = 0;

      let contConfidence = 0;
      let totalDatos = 0;

      let jsonClient = {
        name: "",
        banco: {
          name: "",
          account: "",
        },
        cargo: "",
        salud: "",
        basico: "",
        nomina: "",
        pension: "",
        convenio: "",
        fechaIngreso: "",
        devengos: {
          list: [],
          subtotal: null,
          confidence: null,
        },
        confidence: null,
        sueldoNeto: null,
        descuentos: {
          list: [],
          subtotal: null,
          confidence: null,
        },
        documentNumber: "",
      };

      let jsonCompany = {
        nit: "",
        name: "",
      };

      if (ext === ".png" || ext === ".jpeg" || ext === ".jpg") {
        (async () => {
          let jsonToRead = await documentExtract(filePath, isRequest);

          if (jsonToRead != "error") {
            /**
             * sacamos todas las lineas leidas
             */

            for (const block of jsonToRead.Blocks) {
              if (block.BlockType === "LINE") {
                let strTop =
                  block.Geometry.BoundingBox.Top.toString().substring(0, 6);

                let pos = -1;
                for (let index = 0; index < arrayTextLine.length; index++) {
                  const element = arrayTextLine[index];
                  if (Math.abs(element.top - parseFloat(strTop)) < 0.005) {
                    pos = index;
                    break;
                  }
                }
                if (pos !== -1) {
                  arrayTextLine[pos].arrayText.push({
                    // top: strTop,
                    text: block.Text,
                    left: block.Geometry.BoundingBox.Left.toFixed(2),
                    confidence: block.Confidence,
                  });
                } else {
                  let newElem = {};
                  newElem.top = parseFloat(strTop);
                  newElem.arrayText = [
                    {
                      // top: ":::" + strTop,
                      text: block.Text,
                      left: block.Geometry.BoundingBox.Left.toFixed(2),
                      confidence: block.Confidence,
                    },
                  ];
                  arrayTextLine.push(newElem);
                }

                // #################################################### fin if
              }
            }
            // ################################################## fin for
          }

          /**
           * Posición inicial de tabla de devengos
           */
          let initDevengos = arrayTextLine
            .map((e) => {
              return e.arrayText[0].text;
            })
            .indexOf("CONCEP DESCRIPCION CONCEPTO");

          console.log(initDevengos);

          /**
           * Posición inicial de tabla de deducciones
           */
          let initDeducciones = arrayTextLine
            .map((e) => {
              return e.arrayText[0].text;
            })
            .indexOf("CENTRO COSTO CONCEP DESCRIPCIÓN CONCEPTO");

          console.log(initDeducciones);

          /**
           * Posición final de tabla de devengos / descuentos
           */
          //   let end = arrayTextLine
          //     .map((e) => {
          //       return e.arrayText[0].text;
          //     })
          //     .indexOf("Unidad Org.");

          /**
           * Recorrido del documento para capturar datos fijos donde se
           * declaran 2 variables
           * @bloque que por defecto el valor del dato esta siempre 1 campo
           * debajo del header
           * @columna para ubicar respectivamente el dato por bloque, teniendo
           * en cuenta que cada bloque tiene distintas columnas. Además de que
           * 0 -> Es la primera ya que se devuelve como un Array
           */

          /**
           * Objeto que guarda los elementos que tengan devengos
           */
          let elementDevengos = {};

          /**
           * Objeto que guarda los elementos que tengan descuentos
           */
          let elementDescuentos = {};

          // Recorriendo la tabla

          /**
           * Recorrido unico de la tabla, que guarda dependiendo si es un
           * devengo o un descuento los valores en los Objetos @elementDevengos
           * o @elementDescuentos respectivamente los datos de la columna
           *
           * Estos se validan dependiendo de la coordenada left si hay un dato
           * vacio se guarda como 0 y si hay un dato que no corresponde a la respectiva
           * columna se corre a la columna perteneciente
           *
           * Siendo asi:
           *
           * arrayTextLine[i].arrayText[0] -> Columna Concepto
           * arrayTextLine[i].arrayText[1] -> Columna Unidades
           * arrayTextLine[i].arrayText[2] -> Columna Precio
           * arrayTextLine[i].arrayText[3] -> Columna Devengos o Descuento
           */

          // ############################################
          // console.log(
          //   "JSON COMPANY ----------------------------------------------------------"
          // );
          // console.log(jsonCompany);

          // console.log(
          //   "JSON CLIENT ----------------------------------------------------------"
          // );
          // console.log(jsonClient.devengos);

          resultArray.push(jsonClient);
          resultArray.push(jsonCompany);
          // console.log("JSON A EXPORTAR");
          // console.log(resultArray);

          // arrayTextLine.map((x) => console.log(x));
          jsonToRead ? resolve(resultArray) : resolve(false);
        })();
      }
    } catch (error) {
      console.log("ERROR");
      console.log(error);
      resolve(false);
    }
  });

module.exports = { readPaymentgSupport };
