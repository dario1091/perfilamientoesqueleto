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
              if (
                block.BlockType === "LINE" &&
                block.Geometry.BoundingBox.Left < 0.5
              ) {
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

                // Captura de datos estáticos
                if (block.Text.toUpperCase().startsWith("COMDATA")) {
                  jsonCompany.name = block.Text;
                }
                if (block.Text.toUpperCase().startsWith("NIT")) {
                  jsonCompany.nit = block.Text.slice(4);
                }
                if (block.Text.toUpperCase().startsWith("PERÍODO PAGO")) {
                  jsonClient.nomina = block.Text.split(" ")[4];
                }
                if (block.Text.toUpperCase().startsWith("CARGO")) {
                  jsonClient.cargo = block.Text.split(":")[1];
                }

                // Captura de valores left
                if (block.Text.toUpperCase().startsWith("DEVENGOS")) {
                  leftEarns = block.Geometry.BoundingBox.Left.toFixed(2);
                }

                // Captura de valores left
                if (block.Text.toUpperCase().startsWith("DESCUENTOS")) {
                  leftDiscounts = block.Geometry.BoundingBox.Left.toFixed(2);
                }

                // #################################################### fin if
              }
            }
            // ################################################## fin for
          }

          /**
           * Posición inicial de tabla de devengos / descuentos
           */
          let init = arrayTextLine
            .map((e) => {
              return e.arrayText[0].text;
            })
            .indexOf("Concepto");

          /**
           * Posición final de tabla de devengos / descuentos
           */
          let end = arrayTextLine
            .map((e) => {
              return e.arrayText[0].text;
            })
            .indexOf("Unidad Org.");

          /**
           * Recorrido del documento para capturar datos fijos donde se
           * declaran 2 variables
           * @bloque que por defecto el valor del dato esta siempre 1 campo
           * debajo del header
           * @columna para ubicar respectivamente el dato por bloque, teniendo
           * en cuenta que cada bloque tiene distintas columnas. Además de que
           * 0 -> Es la primera ya que se devuelve como un Array
           */

          for (let i = 0; i < arrayTextLine.length; i++) {
            let bloque = i + 1;
            let columna = 0;

            arrayTextLine[i].arrayText.map((x) => {
              if (x.text === "Total Devengos") {
                columna = 1;
                jsonClient.devengos.subtotal =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "Total Descuentos") {
                columna = 2;
                jsonClient.descuentos.subtotal =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "Empleado") {
                columna = 0;
                if (
                  arrayTextLine[i + 1].arrayText[columna].text === "Comdata"
                ) {
                  jsonClient.name =
                    arrayTextLine[i + 2].arrayText[columna].text;
                } else {
                  jsonClient.name =
                    arrayTextLine[bloque].arrayText[columna].text;
                }
              }

              if (x.text === "EPS") {
                columna = 1;
                jsonClient.salud =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "Ingreso") {
                columna = 0;
                jsonClient.fechaIngreso =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "AFP") {
                columna = 2;
                jsonClient.pension =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "Unidad Org.") {
                columna = 0;
                jsonClient.convenio =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "Neto a Pagar") {
                columna = 3;
                jsonClient.sueldoNeto =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "Sueldo Base") {
                columna = 4;
                jsonClient.basico =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "Núm. Documento") {
                columna = 3;
                jsonClient.documentNumber =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (
                arrayTextLine[i].arrayText[0].text
                  .toUpperCase()
                  .startsWith("BANCO")
              ) {
                columna = 0;
                if (!arrayTextLine[bloque]) {
                  // Si el numero de cuenta está en la misma linea
                  jsonClient.banco.account = arrayTextLine[i].arrayText[
                    columna
                  ].text.replace(/\D/g, "");
                  jsonClient.banco.name = arrayTextLine[i].arrayText[
                    columna
                  ].text.replace(/[0-9]+/g, "");
                } else {
                  jsonClient.banco.name = arrayTextLine[i].arrayText[
                    columna
                  ].text.replace(/[0-9]+/g, "");

                  //Se guarda el numero de cuenta de la siguiente linea
                  jsonClient.banco.account = arrayTextLine[bloque].arrayText[
                    columna
                  ].text.replace(/\D/g, "");
                }
              }

              // Calculo de puntuacion de confiabilidad de lectura del documento
              contConfidence += x.confidence;
              totalDatos++;
              jsonClient.confidence = (contConfidence / totalDatos).toFixed(2);
            });
          }

          // let allowedData = /^[0-9]*(\.?)[0-9]+$/;
          // x.text.match(allowedData) &&
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

          for (let i = init + 1; i < end; i++) {
            /**
             * Variable ternaria que pregunta si la columna unidad es vacia
             * guarda el valor de devengo/descuento en su respectivo campo
             */
            let columnaUnidadVacia =
              arrayTextLine[i].arrayText[1]?.left >= 0.24
                ? arrayTextLine[i].arrayText[1]?.text
                : 0;

            //Recorrido de cada columna para guardar los datos
            arrayTextLine[i].arrayText.map((x) => {
              // List de devengos
              if (x.left > leftEarns && x.left < leftDiscounts) {
                // console.log(arrayTextLine[i].arrayText[0].text);
                elementDevengos = {
                  concepto: arrayTextLine[i].arrayText[0]?.text,
                  unidades:
                    arrayTextLine[i].arrayText[1]?.left >= leftEarns
                      ? 0
                      : arrayTextLine[i].arrayText[1]?.text,
                  precio:
                    arrayTextLine[i].arrayText[2]?.left >= 0.28
                      ? arrayTextLine[i].arrayText[2]?.text
                      : 0,
                  devengo:
                    arrayTextLine[i].arrayText[3]?.left >= leftEarns
                      ? arrayTextLine[i].arrayText[3]?.text
                      : columnaUnidadVacia,
                };
                contConfidence += x.confidence;
                totalDatos++;
                jsonClient.devengos.confidence = (
                  contConfidence / totalDatos
                ).toFixed(2);
                jsonClient.devengos.list.push(elementDevengos);
              }

              // List de descuentos
              if (x.left >= leftDiscounts && x.left < 0.49) {
                elementDescuentos = {
                  concepto: arrayTextLine[i].arrayText[0]?.text,
                  unidades:
                    arrayTextLine[i].arrayText[1]?.left >= leftDiscounts
                      ? 0
                      : arrayTextLine[i].arrayText[1]?.text,
                  precio:
                    arrayTextLine[i].arrayText[2]?.left >= 0.28
                      ? arrayTextLine[i].arrayText[2]?.text
                      : 0,
                  descuentos:
                    arrayTextLine[i].arrayText[3]?.left >= leftDiscounts
                      ? arrayTextLine[i].arrayText[3]?.text
                      : columnaUnidadVacia,
                };

                contConfidence += x.confidence;
                totalDatos++;
                jsonClient.descuentos.confidence = (
                  contConfidence / totalDatos
                ).toFixed(2);
                jsonClient.descuentos.list.push(elementDescuentos);
              }
            });
          }

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
