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
                salud: "NO REGISTRA",
                basico: "",
                nomina: "",
                pension: "NO REGISTRA",
                convenio: "NO REGISTRA",
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
                nit: "800.237.456",
                name: "",
            };

            let client2 = {
                salud: "NO REGISTRA",
                pension: "NO REGISTRA",
                convenio: "NO REGISTRA",
                fechaIngreso: "NO REGISTRA",
                banco: {},
                devengos: {
                    list: [],
                },
                deducciones: {
                    list: [],
                },
            };

            let company2 = { nit: "800.237.456" };

            let contDesprendibles = 0;

            /**
            * Lee 2 facturas con fechas distintas en un mismo documento
            */
            let dobleDesprendible = false;

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
                                    arrayTextLine[pos]?.arrayText.push({
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

                                // Guardando nominas para comparar si hay mas de 2 desprendibles
                                // en 1 sola imagen
                                if (block.Text.toUpperCase().includes("PRIMER QUINCENA")) {
                                    contDesprendibles++;
                                }
                                if (block.Text.toUpperCase().includes("SEGUNDA QUINCENA")) {
                                    contDesprendibles++;
                                }

                                if (block.Text.includes("Descuentos (de ley") || block.Text.includes("Descuentos(de ley") || block.Text.includes("Descuentos (deley")) {
                                    leftDiscounts = block.Geometry.BoundingBox.Left.toFixed(2);
                                }

                                // #################################################### fin if
                            }
                        }
                        // ################################################## fin for
                    }

                    dobleDesprendible = contDesprendibles === 2 ? true : false;
                    console.log("Doble desprendible? : " + dobleDesprendible)
                    /**
                     * Posición inicial de tabla de dev/ded
                     */
                    let init = arrayTextLine
                        .map((e) => {
                            return e.arrayText[0]?.text;
                        })
                        .indexOf("o autorizados)");

                    console.log("Comienzo tabla 1: " + init);

                    /**
                     * Posición final de tabla de dev/ded y campo
                     * de subtotales devengos y deducciones
                     */
                    let end = arrayTextLine
                        .map((e) => {
                            return e.arrayText[0]?.text;
                        })
                        .indexOf("TOTALES:");

                    console.log("Fin tabla 1: " + end);

                    // Referencias de inicio y fin de recorrido de la tabla para segundo desprendible
                    // unica imagen
                    let init2;
                    let end2;


                    if (dobleDesprendible) {
                        init2 = dobleDesprendible
                            ? arrayTextLine
                                .map((e) => {
                                    if (e.arrayText[0]?.top > 0.6) {
                                        return e.arrayText[0]?.text;
                                    }
                                })
                                .indexOf("o autorizados)")
                            : 0;
                        end2 = dobleDesprendible
                            ? arrayTextLine
                                .map((e) => {
                                    if (e.arrayText[0]?.top > 0.6) {
                                        return e.arrayText[0]?.text;
                                    }
                                })
                                .indexOf("TOTALES:")
                            : 0;
                    }

                    console.log("Comienzo tabla 2: " + init2);
                    console.log("Fin tabla 2: " + end2);

                    /**
                     * Coordenadas top del documento
                     */
                    let top;

                    // Referencias top para diferenciar una tabla de la otra
                    let topRefPrimeraTabla;
                    let topRefSegTabla;
                    try {
                        topRefPrimeraTabla = arrayTextLine[end]?.arrayText[0]?.top;
                        dobleDesprendible && (topRefSegTabla = arrayTextLine[end2]?.arrayText[0]?.top)
                    } catch (error) {
                        console.log("Error controlado al guardar referencias top del documento");
                        console.log(error);
                    }

                    // console.log(topRefPrimeraTabla)

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
                     * sacamos todas las lineas leidas
                     */
                    for (let i = 0; i < arrayTextLine.length; i++) {
                        // Referencia bloque adelante
                        let block = i + 1;
                        // let columna = 0;

                        arrayTextLine[i]?.arrayText.map((x) => {
                            if (x.top.includes(":::")) {
                                top = x.top.split(":::")[1];
                            } else {
                                top = x.top;
                            }

                            // CAPTURA DE NOMINA
                            try {
                                if (dobleDesprendible) {
                                    if (top < topRefPrimeraTabla && (x.text.includes("SEGUNDA") || x.text.includes("PRIMER"))) {
                                        client.nomina = x.text;
                                    } else if (top > topRefPrimeraTabla && (x.text.includes("SEGUNDA") || x.text.includes("PRIMER"))) {
                                        client2.nomina = x.text;
                                    }
                                } else {
                                    if (top < topRefPrimeraTabla && (x.text.includes("SEGUNDA") || x.text.includes("PRIMER"))) {
                                        client.nomina = x.text;
                                    }
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de nomina");
                                console.log(error);
                            }

                            // CAPTURA DATOS BASICOS CLIENTE
                            try {
                                if (x.text.toUpperCase().includes("EMPLEADO") && top < 0.4) {
                                    if (x.text.includes(":")) {
                                        client.name = x.text.split(":")[1].trim();
                                    } else {
                                        client.name = x.text.split(" ").slice(1).join(" ");
                                    }
                                }
                                if (x.text.toUpperCase().includes("CEDULA") && top < 0.4) {
                                    if (x.text.includes(":")) {
                                        client.documentNumber = x.text.split(":")[1].trim();
                                    } else {
                                        client.documentNumber = x.text.split(" ").pop();
                                    }
                                }
                                if (dobleDesprendible) {
                                    client2.name = client.name;
                                    client2.documentNumber = client.documentNumber;
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de nombre cliente");
                                console.log(error);
                            }

                            // CAPTURA CARGO
                            try {
                                if (x.text.toUpperCase().includes("CARGO") && top < 0.4) {
                                    if (x.text.includes(":")) {
                                        client.cargo = x.text.split(":")[1].trim();
                                    } else {
                                        client.cargo = x.text.split(" ").slice(1).join(" ");
                                    }
                                }
                                dobleDesprendible && (client2.cargo = client.cargo);
                            } catch (error) {
                                console.log("Error controlado en captura de cargo cliente");
                                console.log(error);
                            }

                            // CAPTURA BANCO
                            try {
                                if (x.text.startsWith("Ent. Financiera") || x.text.startsWith("Ent.Financiera") || x.text.includes("Ent.Financiera") || x.text.includes("Ent. Financiera")) {
                                    if (x.text.includes(":")) {
                                        client.banco.name = x.text.split(":")[1].trim();
                                    } else {
                                        client.banco.name = x.text.split(" ").slice(1).join(" ");
                                    }
                                }
                                if (x.text.toUpperCase().includes("NÚMERO CUENTA") || x.text.toUpperCase().includes("NUMERO CUENTA")) {
                                    if (x.text.includes(":")) {
                                        client.banco.account = x.text.split(":")[1].trim();
                                    } else {
                                        client.banco.account = x.text.split(" ").pop();
                                    }
                                }
                                if (dobleDesprendible) {
                                    client2.banco.name = client.banco.name;
                                    client2.banco.account = client.banco.account;
                                }

                            } catch (error) {
                                console.log("Error controlado en captura de banco");
                                console.log(error);
                            }

                            // CAPTURA SALARIO
                            try {
                                if (x.text.toUpperCase().includes("SALARIO") && top < 0.4) {
                                    if (x.text.includes(":")) {
                                        client.basico = x.text.split(":")[1].trim();
                                    } else {
                                        client.basico = x.text.split(" ").pop();
                                    }
                                }
                                dobleDesprendible && (client2.basico = client.basico);
                            } catch (error) {
                                console.log("Error controlado en captura de salario basico");
                                console.log(error);
                            }

                            // CAPTURA SALARIO
                            try {
                                if (x.text.toUpperCase().includes("SALARIO") && top < 0.4) {
                                    if (x.text.includes(":")) {
                                        client.basico = x.text.split(":")[1].trim();
                                    } else {
                                        client.basico = x.text.split(" ").pop();
                                    }
                                }
                                dobleDesprendible && (client2.basico = client.basico);
                            } catch (error) {
                                console.log("Error controlado en captura de salario basico");
                                console.log(error);
                            }

                            // Calculo de puntuacion de confiabilidad de lectura del documento
                            try {
                                contConfidence += x.confidence;
                                totalDatos++;
                                client.confidence = (contConfidence / totalDatos).toFixed(2);
                                client2.confidence = (contConfidence / totalDatos).toFixed(2);
                            } catch (error) {
                                console.log("Error controlado en captura de confiabilidad del documento");
                                console.log(error);
                            }

                            // CAPTURA SUELDO NETO
                            try {
                                if (dobleDesprendible) {
                                    if (x.text.toUpperCase().includes("PAGAR") && top < 0.7) {
                                        client.sueldoNeto = arrayTextLine[block]?.arrayText[0]?.text.split("$")[1]
                                    } else if (x.text.toUpperCase().includes("PAGAR")) {
                                        client2.sueldoNeto = arrayTextLine[block]?.arrayText[0]?.text.split("$")[1]
                                    }
                                } else {
                                    if (x.text.toUpperCase().includes("PAGAR")) {
                                        client.sueldoNeto = arrayTextLine[block]?.arrayText[0]?.text.split("$")[1]
                                    }
                                }

                            } catch (error) {
                                console.log("Error controlado en captura de sueldo neto");
                                console.log(error);
                            }


                            // CAPTURA DATOS EMPRESA
                            try {
                                if (x.text.toUpperCase().includes("EMTELCO") && top < 0.3) {
                                    company.name = x.text;
                                }
                                if (dobleDesprendible) {
                                    company2.name = company.name;
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de sueldo neto");
                                console.log(error);
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

                    let elementDevengos2 = {};
                    let elementDeducciones2 = {};
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

                    // SI NO HAY DATOS EN LA TABLA 1 o 2
                    if (init + 1 === end) {
                        client.devengos.confidence = "0";
                        client.deducciones.confidence = "0";
                    }

                    if (dobleDesprendible) {
                        if (init2 + 1 === end2) {
                            client2.devengos.confidence = "0";
                            client2.deducciones.confidence = "0";
                        }
                    }

                    let confidenceDevengo = 0;
                    let confidenceDevengo2 = 0;
                    let totalDatosDevengo = 0;
                    let totalDatosDevengo2 = 0;
                    let confidenceDeduccion = 0;
                    let confidenceDeduccion2 = 0;
                    let totalDatosDeduccion = 0;
                    let totalDatosDeduccion2 = 0;
                    /**
                     * Indice de referencia para el header de la tabla
                     */
                    let header = arrayTextLine
                        .map((e) => {
                            return e.arrayText[0]?.text;
                        })
                        .indexOf("Concepto");

                    leftEarns = (arrayTextLine[header]?.arrayText[3]?.left - 0.05).toFixed(2);
                    // console.log('leftEarns: ', leftEarns)
                    let leftUnidades = arrayTextLine[header]?.arrayText[1]?.left;
                    // console.log('leftUnidades', leftUnidades)
                    let leftBase = (arrayTextLine[header]?.arrayText[2]?.left - 0.05).toFixed(2);
                    // console.log('leftBase', leftBase)

                    // CAPTURA DE SUBTOTALES DEVENGO Y DEDUCCION
                    try {
                        arrayTextLine[end].arrayText.map(x => {
                            if (x.left >= leftEarns && x.left < leftDiscounts) {
                                client.devengos.subtotal = x.text.split("$")[1];
                            } else if (x.left > leftDiscounts) {
                                client.deducciones.subtotal = x.text.split("$")[1];
                            }
                        })
                        if (dobleDesprendible) {
                            arrayTextLine[end2].arrayText.map(x => {
                                if (x.left > leftEarns && x.left < leftDiscounts) {
                                    client2.devengos.subtotal = x.text.split("$")[1];
                                } else if (x.left > leftDiscounts) {
                                    client2.deducciones.subtotal = x.text.split("$")[1];
                                }
                            })
                        }
                    } catch (error) {
                        console.log("Error controlado en captura de subtotales");
                        console.log(error);
                    }

                    // RECORRIDO DE TABLA
                    for (let i = init + 1; i < end; i++) {
                        arrayTextLine[i].arrayText.map(x => {
                            let conceptoCodigo;
                            let concepto;
                            let unidades;
                            let precio;
                            let devengo;
                            let deduccion;

                            // console.log(x)
                            if (x.left < leftUnidades) {
                                concepto = x?.text
                                    .replace(/[\d]+/g, "")
                                    .split(" ").splice(1).join(" ");

                                conceptoCodigo = x?.text.replace(/\D/g, "");

                                let elementConcepto = {
                                    concepto,
                                }
                                let elementConceptoCodigo = {
                                    conceptoCodigo,
                                }
                                elementDevengos = Object.assign({}, elementConceptoCodigo, elementConcepto)
                                elementDeducciones = Object.assign({}, elementConceptoCodigo, elementConcepto)
                            }
                            if (x.left > leftEarns && x.left < leftDiscounts) {
                                devengo = x.text.split("$")[1];
                                elementDevengos.devengo = devengo;
                            }
                            if (x.left > leftUnidades && x.left < leftBase) {
                                unidades = x.text === "None" ? "0" : x.text;
                                elementDevengos.unidades = unidades;
                                elementDeducciones.unidades = unidades;
                            }
                            if (x.left > leftBase && x.left < leftEarns) {
                                precio = x.text.split("$")[1];
                                elementDevengos.precio = precio;
                                elementDeducciones.precio = precio;
                            }
                            if (x.left > leftDiscounts) {
                                deduccion = x.text.split("$")[1];
                                elementDeducciones.deduccion = deduccion;
                            }
                            if (devengo && devengo !== "0") {
                                confidenceDevengo += x.confidence;
                                totalDatosDevengo++;
                                client.devengos.list.push(elementDevengos);
                                client.devengos.confidence = (
                                    confidenceDevengo / totalDatosDevengo
                                ).toFixed(2);
                            }
                            if (deduccion && deduccion !== "0") {
                                confidenceDeduccion += x.confidence;
                                totalDatosDeduccion++;
                                client.deducciones.list.push(elementDeducciones);
                                client.deducciones.confidence = (
                                    confidenceDeduccion / totalDatosDeduccion
                                ).toFixed(2);
                            }
                        })
                    }

                    // LECTURA SEGUNDO DESPRENDIBLE
                    if (dobleDesprendible) {
                        for (let i = init2 + 1; i < end2; i++) {
                            arrayTextLine[i].arrayText.map(x => {
                                let conceptoCodigo;
                                let concepto;
                                let unidades;
                                let precio;
                                let devengo;
                                let deduccion;

                                if (x.left < leftUnidades) {
                                    concepto = x?.text
                                        .replace(/[\d]+/g, "")
                                        .split(" ").splice(1).join(" ");

                                    conceptoCodigo = x?.text.replace(/\D/g, "");

                                    let elementConcepto = {
                                        concepto,
                                    }
                                    let elementConceptoCodigo = {
                                        conceptoCodigo,
                                    }
                                    elementDevengos2 = Object.assign({}, elementConceptoCodigo, elementConcepto)
                                    elementDeducciones2 = Object.assign({}, elementConceptoCodigo, elementConcepto)
                                }
                                if (x.left > leftEarns && x.left < leftDiscounts) {
                                    devengo = x.text.split("$")[1];
                                    elementDevengos2.devengo = devengo;
                                }
                                if (x.left > leftUnidades && x.left < leftBase) {
                                    unidades = x.text === "None" ? "0" : x.text;
                                    elementDevengos2.unidades = unidades;
                                    elementDeducciones2.unidades = unidades;
                                }
                                if (x.left > leftBase && x.left < leftEarns) {
                                    precio = x.text.split("$")[1];
                                    elementDevengos2.precio = precio;
                                    elementDeducciones2.precio = precio;
                                }
                                if (x.left > leftDiscounts) {
                                    deduccion = x.text.split("$")[1];
                                    elementDeducciones2.deduccion = deduccion;
                                }
                                if (devengo && devengo !== "0") {
                                    confidenceDevengo2 += x.confidence;
                                    totalDatosDevengo2++;
                                    client2.devengos.list.push(elementDevengos2);
                                    client2.devengos.confidence = (
                                        confidenceDevengo2 / totalDatosDevengo2
                                    ).toFixed(2);
                                }
                                if (deduccion && deduccion !== "0") {
                                    confidenceDeduccion2 += x.confidence;
                                    totalDatosDeduccion2++;
                                    client2.deducciones.list.push(elementDeducciones2);
                                    client2.deducciones.confidence = (
                                        confidenceDeduccion2 / totalDatosDeduccion2
                                    ).toFixed(2);
                                }
                            })
                        }
                    }

                    // MUESTREO TEMPORAL
                    console.log(":::::::::::::::::::DEVENGOS 1:::::::::::::::::::");
                    console.log(client.devengos);
                    console.log(":::::::::::::::::::DEDUCCIONES 1:::::::::::::::::::");
                    console.log(client.deducciones);

                    if (dobleDesprendible) {
                        console.log(":::::::::::::::::::DEVENGOS 2:::::::::::::::::::");
                        console.log(client2.devengos);
                        console.log(":::::::::::::::::::DEDUCCIONES 2:::::::::::::::::::");
                        console.log(client2.deducciones);
                    }

                    if (dobleDesprendible) {
                        resultObject = { client, company, client2, company2 };
                    } else {
                        resultObject = { client, company };
                    }

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
