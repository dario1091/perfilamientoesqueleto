var path = require("path");
// const fs = require("fs");
const { documentExtract } = require("../utils.js");

const readPaymentgSupport = (filePath, isRequest = false) =>
  new Promise((resolve, reject) => {
    try {
      let ext = path.extname(filePath);

      let arrayTextLine = [];

      /**
       * Json de resultado
       */
      let resultObject = {};

      /**
       * Left de devengos
       */
      let leftEarns = 0;

      /**
       * Left de descuentos
       */
      let leftDiscounts = 0;

      let leftValorEarns;
      let leftValorDisc;

      let contConfidence = 0;
      let contConfidence2 = 0;
      let totalDatos = 0;
      let totalDatos2 = 0;

      let client = {
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
        fechaIngreso: "NO REGISTRA",
        devengos: {
          list: [],
          subtotal: null,
          confidence: null,
        },
        confidence: null,
        sueldoNeto: null,
        deducciones: {
          list: [],
          subtotal: null,
          confidence: null,
        },
        documentNumber: "",
      };

      let company = {
        nit: "",
        name: "",
      };

      let client2 = {
        fechaIngreso: "NO REGISTRA",
        banco: {},
        devengos: {},
        deducciones: {},
      };

      let company2 = {};

      let arrayAux = [];

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
                // console.log(strTop);

                // console.log(block);

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
                    top: ":::" + strTop,
                    text: block.Text,
                    left: block.Geometry.BoundingBox.Left.toFixed(2),
                    confidence: block.Confidence,
                  });
                } else {
                  let newElem = {};
                  newElem.top = parseFloat(strTop);
                  newElem.arrayText = [
                    {
                      top: strTop,
                      text: block.Text,
                      left: block.Geometry.BoundingBox.Left.toFixed(2),
                      confidence: block.Confidence,
                    },
                  ];
                  arrayTextLine.push(newElem);
                }

                if (block.Text.toUpperCase().includes("NOMINA")) {
                  arrayAux.push(block.Text);
                }

                // Captura left de devengos y deducciones
                if (block.Text.toUpperCase().includes("SUBTOTAL")) {
                  if (block.Geometry.BoundingBox.Left.toFixed(2) < 0.5) {
                    leftValorEarns = block.Geometry.BoundingBox.Left.toFixed(2);
                  }
                  if (block.Geometry.BoundingBox.Left.toFixed(2) > 0.5) {
                    leftValorDisc = block.Geometry.BoundingBox.Left.toFixed(2);
                  }
                }

                // #################################################### fin if
              }
            }
            // ################################################## fin for
          }

          /**
           * Lee 2 facturas con fechas distintas en un mismo documento
           */
          let dobleFactura = false;

          if (arrayAux.length === 2) {
            let nominaPrimeraFactura = arrayAux[0].split(" ").pop();
            let nominaSegundaFactura = arrayAux[1].split(" ").pop();
            if (nominaPrimeraFactura !== nominaSegundaFactura) {
              dobleFactura = true;
            }
          }

          // console.log(leftValorEarns);
          // console.log(leftValorDisc);

          /**
           * TODO: Posición inicial de tabla de dev/ded
           */
          let init;

          // referencia para capturar el fin de la tabla

          /**
           * TODO: Posición final de tabla de dev/ded y campo
           * de subtotales devengos y deducciones
           */
          let end;

          /**
           * Coordenadas top del documento
           */
          let top;

          /**
           * Recorrido del documento para capturar datos fijos donde se
           * declaran 2 variables
           * @bloque que por defecto el valor del dato esta siempre 1 campo
           * debajo del header
           * @columna para ubicar respectivamente el dato por bloque, teniendo
           * en cuenta que cada bloque tiene distintas columnas. Además de que
           * 0 -> Es la primera ya que se devuelve como un Array
           */

          // NOTA: LOS TEXTOS QUE NO TIENEN COHERENCIA EN LAS
          // VALIDACIONES SON CASOS ESPECIFICOS DE DOCUMENTOS
          // QUE NO SON BIEN LEIDOS
          // guardar solo numeros .replace(/\D/g, "")
          // guardar solo texto .replace(/[0-9]+/g, "")

          /**
           * TODO: sacamos todas las lineas leidas
           */
          for (let i = 0; i < arrayTextLine.length; i++) {
            let block = i + 1;
            // let columna = 0;

            arrayTextLine[i].arrayText.map((x) => {
              if (x.top.includes(":::")) {
                top = x.top.split(":::")[1];
              } else {
                top = x.top;
              }

              // Calculo de puntuacion de confiabilidad de lectura del documento
              if (dobleFactura) {
                if (top < 0.5) {
                  contConfidence += x.confidence;
                  totalDatos++;
                  client.confidence = (contConfidence / totalDatos).toFixed(2);
                }
                if (top > 0.5) {
                  contConfidence2 += x.confidence;
                  totalDatos2++;
                  client2.confidence = (contConfidence2 / totalDatos2).toFixed(
                    2
                  );
                }
              } else {
                contConfidence += x.confidence;
                totalDatos++;
                client.confidence = (contConfidence / totalDatos).toFixed(2);
              }

              // Guardando nombre de la compañía
              if (
                dobleFactura &&
                x.text.includes("COLOMBIA") &&
                !x.text.includes("BANCO")
              ) {
                top < 0.5 && (company.name = x.text);
                top > 0.5 && (company2.name = x.text);
              } else if (
                x.text.includes("COLOMBIA") &&
                !x.text.includes("BANCO")
              ) {
                company.name = x.text;
              }

              // Guardando nombre y documento del cliente
              if (dobleFactura && x.text.includes("COMPROBANTE DE PAGO")) {
                if (top < 0.5) {
                  client.documentNumber =
                    arrayTextLine[block].arrayText[2]?.text;
                  client.name = arrayTextLine[block].arrayText[0]?.text;

                  // Captura de nit primera factura
                  arrayTextLine[i - 1].arrayText.map((nit) => {
                    if (nit.text.includes("-")) {
                      company.nit = nit.text.split(" ").pop();
                    }
                  });
                }
                if (top > 0.5) {
                  client2.documentNumber =
                    arrayTextLine[block].arrayText[2]?.text;
                  client2.name = arrayTextLine[block].arrayText[0]?.text;

                  // Captura de nit segunda factura
                  arrayTextLine[i - 1].arrayText.map((nit) => {
                    if (nit.text.includes("-")) {
                      company2.nit = nit.text.split(" ").pop();
                    }
                  });
                }
              } else if (x.text.includes("COMPROBANTE DE PAGO")) {
                client.documentNumber = arrayTextLine[block].arrayText[2]?.text;
                client.name = arrayTextLine[block].arrayText[0]?.text;

                // Captura de nit
                arrayTextLine[i - 1].arrayText.map((nit) => {
                  if (nit.text.includes("-")) {
                    company.nit = nit.text.split(" ").pop();
                  }
                });
              }

              // Guardando convenio
              if (dobleFactura && x.text.toUpperCase().startsWith("CONVENIO")) {
                top < 0.5 &&
                  (client.convenio = x.text.split(" ").slice(1).join(" "));
                top > 0.5 &&
                  (client2.convenio = x.text.split(" ").slice(1).join(" "));
              } else if (x.text.toUpperCase().startsWith("CONVENIO")) {
                client.convenio = x.text.split(" ").slice(1).join(" ");
              }

              // Guardando nomina
              if (dobleFactura && x.text.toUpperCase().startsWith("NOMINA")) {
                top < 0.5 && (client.nomina = x.text.split(" ").pop());
                top > 0.5 && (client2.nomina = x.text.split(" ").pop());
              } else if (x.text.toUpperCase().startsWith("NOMINA")) {
                client.nomina = x.text.split(" ").pop();
              }

              // Guardando pension
              if (dobleFactura && x.text.toUpperCase().includes("PENSION")) {
                top < 0.5 &&
                  (client.pension = x.text.split(" ").slice(1).join(" "));
                top > 0.5 &&
                  (client2.pension = x.text.split(" ").slice(1).join(" "));
              } else if (x.text.toUpperCase().includes("PENSION")) {
                client.pension = x.text.split(" ").slice(1).join(" ");
              }

              // Guardando numero de cuenta
              if (dobleFactura && x.text.toUpperCase().includes("CUENTA")) {
                top < 0.5 && (client.banco.account = x.text.split(" ").pop());
                top > 0.5 && (client2.banco.account = x.text.split(" ").pop());
              } else if (x.text.toUpperCase().includes("CUENTA")) {
                client.banco.account = x.text.split(" ").pop();
              }

              // Guardando nombre del banco
              if (dobleFactura && x.text.toUpperCase().startsWith("BANCO")) {
                top < 0.5 &&
                  (client.banco.name = x.text.split(" ").slice(1).join(" "));
                top > 0.5 &&
                  (client2.banco.name = x.text.split(" ").slice(1).join(" "));
              } else if (x.text.toUpperCase().startsWith("BANCO")) {
                client.banco.name = x.text.split(" ").slice(1).join(" ");
              }

              // Guardando salario base
              if (dobleFactura && x.text.includes("BASICO")) {
                top < 0.5 && (client.basico = x.text.split(" ").pop());
                top > 0.5 && (client2.basico = x.text.split(" ").pop());
              } else if (x.text.includes("BASICO")) {
                client.basico = x.text.split(" ").pop();
              }

              // Guardando cargo
              if (dobleFactura && x.text.includes("CARGO")) {
                top < 0.5 &&
                  (client.cargo = x.text.split(" ").slice(1).join(" "));
                top > 0.5 &&
                  (client2.cargo = x.text.split(" ").slice(1).join(" "));
              } else if (x.text.includes("CARGO")) {
                client.cargo = x.text.split(" ").slice(1).join(" ");
              }

              // Guardando salud
              if (dobleFactura && x.text.includes("SALUD")) {
                top < 0.5 &&
                  (client.salud = x.text.split(" ").slice(1).join(" "));
                top > 0.5 &&
                  (client2.salud = x.text.split(" ").slice(1).join(" "));
              } else if (x.text.includes("SALUD")) {
                client.salud = x.text.split(" ").slice(1).join(" ");
              }

              // Guardando neto
              if (
                dobleFactura &&
                (x.text.includes("CVS") || x.text.includes("SON"))
              ) {
                // Primera Factura validando signo $
                top < 0.5 &&
                  (client.sueldoNeto = arrayTextLine[
                    i - 1
                  ].arrayText[0]?.text.includes("$")
                    ? arrayTextLine[i - 1].arrayText[0]?.text
                        .split("$")[1]
                        .trim()
                    : arrayTextLine[i - 1].arrayText[0]?.text);

                top > 0.5 &&
                  (client2.sueldoNeto = arrayTextLine[
                    i - 1
                  ].arrayText[0]?.text.includes("$")
                    ? arrayTextLine[i - 1].arrayText[0]?.text
                        .split("$")[1]
                        .trim()
                    : arrayTextLine[i - 1].arrayText[0]?.text);
              }
              // Unica factura
              else if (x.text.includes("CVS") || x.text.includes("SON")) {
                let lastBlock = arrayTextLine[i - 1].arrayText[0]?.text;
                if (lastBlock.includes("$")) {
                  client.sueldoNeto = lastBlock.split("$")[1].trim();
                } else {
                  client.sueldoNeto = lastBlock;
                }
              }

              // Guardando subtotales de devengos/deducciones
              if (dobleFactura && x.text.toUpperCase().includes("SUBTOTAL")) {
                if (top < 0.5) {
                  // Captura de devengos primera factura
                  if (arrayTextLine[i].arrayText[1]?.text.includes("$")) {
                    client.devengos.subtotal = arrayTextLine[
                      i
                    ].arrayText[1]?.text
                      .split("$")[1]
                      .trim();
                  } else {
                    client.devengos.subtotal =
                      arrayTextLine[i].arrayText[1]?.text;
                  }
                  // Captura de deducciones primera factura
                  if (arrayTextLine[i].arrayText[3]?.text.includes("$")) {
                    client.deducciones.subtotal = arrayTextLine[
                      i
                    ].arrayText[3]?.text
                      .split("$")[1]
                      .trim();
                  } else {
                    client.deducciones.subtotal =
                      arrayTextLine[i].arrayText[3]?.text;
                  }
                }

                if (top > 0.5) {
                  // Captura de devengos segunda factura
                  if (arrayTextLine[i].arrayText[1]?.text.includes("$")) {
                    client2.devengos.subtotal = arrayTextLine[
                      i
                    ].arrayText[1]?.text
                      .split("$")[1]
                      .trim();
                  } else {
                    client2.devengos.subtotal =
                      arrayTextLine[i].arrayText[1]?.text;
                  }
                  // Captura de deducciones segunda factura
                  if (arrayTextLine[i].arrayText[3]?.text.includes("$")) {
                    client2.deducciones.subtotal = arrayTextLine[
                      i
                    ].arrayText[3]?.text
                      .split("$")[1]
                      .trim();
                  } else {
                    client2.deducciones.subtotal =
                      arrayTextLine[i].arrayText[3]?.text;
                  }
                }
              } else if (x.text.toUpperCase().includes("SUBTOTAL")) {
                // Captura de devengos unica factura
                if (arrayTextLine[i].arrayText[1]?.text.includes("$")) {
                  client.devengos.subtotal = arrayTextLine[i].arrayText[1]?.text
                    .split("$")[1]
                    .trim();
                } else {
                  client.devengos.subtotal =
                    arrayTextLine[i].arrayText[1]?.text;
                }
                // Captura de deducciones unica factura
                if (arrayTextLine[i].arrayText[3]?.text.includes("$")) {
                  client.deducciones.subtotal = arrayTextLine[
                    i
                  ].arrayText[3]?.text
                    .split("$")[1]
                    .trim();
                } else {
                  client.deducciones.subtotal =
                    arrayTextLine[i].arrayText[3]?.text;
                }
              }
            });
          }

          /**
           * Objeto que guarda los elementos que tengan devengos
           */
          let elementDevengos = {};

          /**
           * Objeto que guarda los elementos que tengan descuentos
           */
          let elementDeducciones = {};

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
           * Siendo asi 4 columnas para devengos y 4 columnas para deducciones
           *                                  Devengos
           * arrayTextLine[i].arrayText[0] -> Columna Concepto
           * arrayTextLine[i].arrayText[1] -> Columna Descripcion
           * arrayTextLine[i].arrayText[2] -> Columna Cantidad
           * arrayTextLine[i].arrayText[3] -> Columna Devengos
           *
           *                                  Deducciones
           * arrayTextLine[i].arrayText[4] -> Columna Centro costo
           * arrayTextLine[i].arrayText[5] -> Columna Concepto
           * arrayTextLine[i].arrayText[6] -> Columna Descripcion
           * arrayTextLine[i].arrayText[7] -> Columna Descuento
           */

          /**
           * TODO: Referencias left de las columnas de la tabla
           */

          // SI NO HAY DATOS EN LA TABLA
          if (init + 1 === end) {
            client.devengos.confidence = "0";
            client.deducciones.confidence = "0";
          }

          // RECORRIDO DE TABLA
          for (let i = init + 1; i < end; i++) {
            arrayTextLine[i].arrayText.map((x) => {});
          }

          // MUESTREO TEMPORAL
          // console.log(":::::::::::::::::::DEVENGOS:::::::::::::::::::");
          // console.log(client.devengos);
          // console.log(":::::::::::::::::::DEDUCCIONES:::::::::::::::::::");
          // console.log(client.deducciones);

          // AÑADIENDO LOS RESULTADOS DE LOS OBJETOS
          //   resultObject = {
          //     client,
          //     company,
          //   };

          if (dobleFactura) {
            resultObject = { client, company, client2, company2 };
          } else {
            resultObject = { client, company };
          }

          // console.log(client2);

          // arrayTextLine.map((x) => console.log(x));
          jsonToRead ? resolve(resultObject) : resolve(false);
        })();
      }
    } catch (error) {
      console.log("ERROR");
      console.log(error);
      resolve(false);
    }
  });

module.exports = { readPaymentgSupport };
