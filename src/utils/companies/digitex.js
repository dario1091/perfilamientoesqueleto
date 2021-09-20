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

                // Captura de datos fijos
                if (block.Text.toUpperCase().startsWith("COMDATA")) {
                  jsonCompany.name = block.Text;
                }
                if (block.Text.toUpperCase().startsWith("NIT")) {
                  jsonCompany.nit = block.Text.split(":")[1];
                }
                if (block.Text.toUpperCase().startsWith("PERÍODO PAGO")) {
                  jsonClient.nomina = block.Text.split(" ")[2];
                }
                if (block.Text.toUpperCase().startsWith("BANCO")) {
                  jsonClient.banco.account = block.Text.replace(/\D/g, "");
                  jsonClient.banco.name = block.Text.replace(/[0-9]+/g, "");
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

          console.log(init);

          /**
           * Posición final de tabla de devengos / descuentos
           */
          let end = arrayTextLine
            .map((e) => {
              return e.arrayText[0].text;
            })
            .indexOf("Unidad Org.");

          console.log(end);

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
                console.log(arrayTextLine[i].arrayText[1].left);
                jsonClient.descuentos.list.push(elementDescuentos);
              }
            });
          }

          // ############################################
          console.log(
            "JSON COMPANY ----------------------------------------------------------"
          );
          console.log(jsonCompany);

          console.log(
            "JSON CLIENT ----------------------------------------------------------"
          );
          console.log(jsonClient.descuentos);
          // console.log(arrayTextLine[2]);
          // arrayTextLine.map((x) => console.log(x));
          jsonToRead ? resolve(arrayTextLine) : resolve(false);
        })();
      }
    } catch (error) {
      console.log("ERROR");
      console.log(error);
      resolve(false);
    }
  });

module.exports = { readPaymentgSupport };
