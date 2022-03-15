var path = require("path");
// const fs = require("fs");
const { documentExtract } = require("../utils.js");

const getNominaWithoutText = (text) => {
    // text = "15/ene/2022";
    let month = "";
    let nomina = "";

    if (text.includes("/")) {
        month = text.split("/")[1];
    } else {
        month = text.split("-")[1];
    }

    if (month.toUpperCase().startsWith("ENE")) nomina = text.replace(month, "01");
    if (month.toUpperCase().startsWith("FEB")) nomina = text.replace(month, "02");
    if (month.toUpperCase().startsWith("MAR")) nomina = text.replace(month, "03");
    if (month.toUpperCase().startsWith("ABR")) nomina = text.replace(month, "04");
    if (month.toUpperCase().startsWith("MAY")) nomina = text.replace(month, "05");
    if (month.toUpperCase().startsWith("JUN")) nomina = text.replace(month, "06");
    if (month.toUpperCase().startsWith("JUL")) nomina = text.replace(month, "07");
    if (month.toUpperCase().startsWith("AGO")) nomina = text.replace(month, "08");
    if (month.toUpperCase().startsWith("SEP")) nomina = text.replace(month, "09");
    if (month.toUpperCase().startsWith("OCT")) nomina = text.replace(month, "10");
    if (month.toUpperCase().startsWith("NOV")) nomina = text.replace(month, "11");
    if (month.toUpperCase().startsWith("DIC")) nomina = text.replace(month, "12");

    if (nomina === "") {
        nomina = "NO REGISTRA";
    }
    // console.log("NOMINA: " + nomina)
    return nomina;
}

const getDoubleDataBasic = (pos, arr, textValidation, textSplitCol1, textSplitCol2) => {
    let firstColumn;
    let secondColumn;

    if (arr[pos].arrayText[3]) {
        // console.log('VIENEN LAS 4 COLUMNAS SEPARADAS')
        firstColumn = arr[pos]?.arrayText[1]?.text;
        secondColumn = arr[pos]?.arrayText[3]?.text;
    } else {
        if (arr[pos].arrayText[2]) {
            // console.log('VIENEN 3 COLUMNAS SEPARADAS')
            if (arr[pos]?.arrayText[1]?.text.toUpperCase().startsWith(textValidation)) {
                // console.log('LA PRIMRER COLUMNA VIENE CONJUNTA')
                firstColumn = arr[pos]?.arrayText[0]?.text.split(textSplitCol1).pop().trim();
                secondColumn = arr[pos]?.arrayText[2]?.text;
            } else {
                // console.log('LA TERCER COLUMNA VIENE CONJUNTA')
                firstColumn = arr[pos]?.arrayText[1]?.text;
                secondColumn = arr[pos]?.arrayText[2]?.text.split(textSplitCol2).pop().trim();
            }
        } else {
            // console.log('SOLO VIENEN 2 COLUMNAS')
            firstColumn = arr[pos]?.arrayText[0]?.text.split(textSplitCol1).pop().trim();
            secondColumn = arr[pos]?.arrayText[1]?.text.split(textSplitCol2).pop().trim();
        }
    }

    return { firstColumn, secondColumn };
}

const getOneDataBasic = (pos, arr, textValidation, column) => {
    let data;
    if (column === 1) {
        if (arr[pos]?.arrayText[1]?.text.toUpperCase().startsWith(textValidation)) {
            // console.log("LA INFO DEL CARGO VIENE EN LA PRIMERA COLUMNA")
            data = arr[pos]?.arrayText[0]?.text.split(" ").pop().trim();
        } else {
            // console.log("LA INFO VIENE EN LAS 2 PRIMERAS COLUMNAS")
            data = arr[pos]?.arrayText[1]?.text;
        }
    } else {
        if (arr[pos].arrayText[3]) {
            // console.log('VIENEN LAS 4 COLUMNAS SEPARADAS')
            data = arr[pos]?.arrayText[3]?.text;
        } else {
            if (arr[pos].arrayText[2]) {
                // console.log('VIENEN 3 COLUMNAS SEPARADAS')
                if (arr[pos]?.arrayText[1]?.text.toUpperCase().startsWith(textValidation)) {
                    // console.log('LA PRIMRER COLUMNA VIENE CONJUNTA')
                    data = arr[pos]?.arrayText[2]?.text;
                } else {
                    // console.log('LA TERCER COLUMNA VIENE CONJUNTA')
                    data = arr[pos]?.arrayText[2]?.text.split(" ").pop().trim();
                }
            } else {
                // console.log('SOLO VIENEN 2 COLUMNAS')
                data = arr[pos]?.arrayText[1]?.text.split(" ").pop().trim();
            }
        }
    }

    return data;
}

const getNetIncome = (pos, arr) => {
    let netIncome;
    if (arr[pos]?.arrayText[1]) {
        netIncome = arr[pos]?.arrayText[1]?.text;
    } else {
        netIncome = arr[pos]?.arrayText[0]?.text.split(" ").pop().trim();
    }
    // console.log("NET INCOME " + netIncome)
    return netIncome;
}

const readPaymentgSupport = (filePath, isRequest = false) =>
    new Promise((resolve, reject) => {
        try {
            let ext = path.extname(filePath);

            let arrayTextLine = [];

            /**
             * Json de resultado
             */
            let resultObject = {};

            let resultArr = [];

            /**
             * Left de devengos
             */
            let leftAccrual = 0;

            /**
             * Left de descuentos
             */
            let leftDeductions = 0;

            let contConfidence = 0;
            // let contConfidence2 = 0;
            let totalDatos = 0;
            // let totalDatos2 = 0;

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
                nit: "",
                name: "",
            };

            let client2 = {
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

            let company2 = { nit: "" };

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

                                // #################################################### fin if
                            }
                        }
                        // ################################################## fin for
                    }

                    dobleDesprendible = contDesprendibles === 2 ? true : false;
                    console.log("\n----------------------------------------------------------\n")
                    console.log("Doble desprendible? : " + dobleDesprendible)
                    /**
                     * Posición inicial de tabla de dev
                     */
                    let initAcc = arrayTextLine
                        .map((e) => {
                            if (e.arrayText[0]?.text.toUpperCase().startsWith("DEVENGADOS")) {
                                return e.arrayText[0]?.text.toUpperCase();
                            }
                        })
                        .indexOf("DEVENGADOS");

                    console.log("Comienzo tabla devengos: " + initAcc);

                    /**
                     * Posición inicial de tabla de ded
                     */
                    let initDed = arrayTextLine
                        .map((e) => {
                            if (e.arrayText[0]?.text.toUpperCase().startsWith("DEDUCCIONES")) {
                                return e.arrayText[0]?.text.toUpperCase();
                            }
                        })
                        .indexOf("DEDUCCIONES");

                    console.log("Comienzo tabla deducciones: " + initDed);

                    /**
                     * Posición final de tabla de dev y campo
                     * de subtotales devengos
                     */
                    let endAcc = 0;
                    // console.log(arrayTextLine[initDed - 1])
                    if (arrayTextLine[initDed - 1]?.arrayText[0]?.text.toUpperCase().startsWith("TOTAL")) {
                        endAcc = (initDed - 1);
                    }
                    console.log("Fin tabla devengos: " + endAcc);

                    /**
                     * Posición final de tabla de ded y campo
                     * de subtotales deducciones
                     */
                    let endDed = arrayTextLine
                        .map((e) => {
                            if (e.arrayText[0]?.text.toUpperCase().startsWith("NETO")) {
                                return e.arrayText[0]?.text.toUpperCase();
                            }
                        })
                        .indexOf("NETO");

                    endDed = endDed - 1;
                    console.log("Fin tabla deducciones: " + endDed);


                    let leftReceived = 0;


                    // Referencias de inicio y fin de recorrido de la tabla para segundo desprendible
                    // unica imagen
                    // let init2;
                    // let end2;


                    // if (dobleDesprendible) {
                    //     init2 = dobleDesprendible
                    //         ? arrayTextLine
                    //             .map((e) => {
                    //                 if (e.arrayText[0]?.top > 0.6) {
                    //                     return e.arrayText[0]?.text;
                    //                 }
                    //             })
                    //             .indexOf("o autorizados)")
                    //         : 0;
                    //     end2 = dobleDesprendible
                    //         ? arrayTextLine
                    //             .map((e) => {
                    //                 if (e.arrayText[0]?.top > 0.6) {
                    //                     return e.arrayText[0]?.text;
                    //                 }
                    //             })
                    //             .indexOf("TOTALES:")
                    //         : 0;
                    // }

                    // console.log("Comienzo tabla 2: " + init2);
                    // console.log("Fin tabla 2: " + end2);

                    /**
                     *  Coordenadas top del documento
                     */
                    let top;


                    // Referencias top para diferenciar una tabla de la otra
                    // let topRefPrimeraTabla;
                    // // let topRefSegTabla;
                    // try {
                    //     topRefPrimeraTabla = arrayTextLine[end]?.arrayText[0]?.top;
                    //     // dobleDesprendible && (topRefSegTabla = arrayTextLine[end2]?.arrayText[0]?.top)
                    // } catch (error) {
                    //     console.log("Error controlado al guardar referencias top del documento");
                    //     console.log(error);
                    // }

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
                                if (x.text.toUpperCase().startsWith("FECHAS")) {
                                    client.nomina = x.text.split(" ").pop().trim();
                                    // console.log(client.nomina)
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de nomina");
                                console.log(error);
                            }

                            // CAPTURA DATOS BASICOS CLIENTE
                            try {
                                if (x.text.toUpperCase().startsWith("IDENTIFICA")) {
                                    const { firstColumn, secondColumn } = getDoubleDataBasic(i, arrayTextLine, "NOMBRE", " ", " ");
                                    client.documentNumber = firstColumn;
                                    client.name = secondColumn;
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de nombre y cedula del cliente");
                                console.log(error);
                            }

                            // CAPTURA CARGO
                            try {
                                if (x.text.toUpperCase().startsWith("CARGO")) {
                                    client.cargo = getOneDataBasic(i, arrayTextLine, "TIPO", 1);
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de cargo cliente");
                                console.log(error);
                            }

                            // CAPTURA BANCO INFO
                            try {
                                if (x.text.toUpperCase().startsWith("ENTIDAD FINANC")) {
                                    const { firstColumn, secondColumn } = getDoubleDataBasic(i, arrayTextLine, "NÚM", "Financiera", "Cuenta");
                                    client.banco.name = firstColumn;
                                    client.banco.account = secondColumn;
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de banco");
                                console.log(error);
                            }

                            // CAPTURA SALUD Y PENSION
                            try {
                                if (x.text.toUpperCase().startsWith("ENTIDAD SALUD") || x.text.toUpperCase().startsWith("ENTDAD SALUD")) {
                                    leftReceived = (parseFloat(x.left) + 0.03).toFixed(2).toString();
                                    const { firstColumn, secondColumn } = getDoubleDataBasic(i, arrayTextLine, "ENTIDAD", "Salud", "Fondo")
                                    client.salud = firstColumn;
                                    client.pension = secondColumn;
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de confiabilidad del documento");
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

                            // CAPTURA DE SALARIO BASICO
                            try {
                                if (x.text.toUpperCase().startsWith("ASIGNA")) {
                                    client.basico = getOneDataBasic(i, arrayTextLine, "TIPO", 1);
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de salario basico");
                                console.log(error);
                            }

                            // CAPTURA SUELDO NETO
                            try {
                                if (x.text.toUpperCase().startsWith("NETO")) {
                                    client.sueldoNeto = arrayTextLine[i]?.arrayText[1]?.text;
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de sueldo neto");
                                console.log(error);
                            }


                            // CAPTURA DATOS EMPRESA
                            try {
                                if (x.text.toUpperCase().startsWith("NIT")) {
                                    company.name = arrayTextLine[i - 1]?.arrayText[0]?.text;

                                    // Get nit company
                                    if (isNaN(parseInt(x.text.replace(/\D/g, "")))) {
                                        company.nit = arrayTextLine[i]?.arrayText[1]?.text;
                                    } else {
                                        company.nit = x.text.replace(/\D/g, "")
                                    }
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de nombre de la empresa");
                                console.log(error);
                            }

                            // // Left recibi de conformidad
                            // try {
                            //     if (arrayTextLine[i]?.arrayText[0]?.text.toUpperCase().startsWith("RECIB")) {
                            //         leftReceived = (arrayTextLine[i]?.arrayText[0]?.left - 0.025).toFixed(2);
                            //     }
                            // } catch (error) {
                            //     console.log("Error controlado en la captura de left de recibi conforme");
                            //     console.log(error)
                            // }
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
                     *                                  Devengos / Deducciones
                     * arrayTextLine[i].arrayText[0] -> Columna Devengados / Deducciones
                     * arrayTextLine[i].arrayText[1] -> Columna Cantidad
                     * arrayTextLine[i].arrayText[2] -> Columna Base
                     * arrayTextLine[i].arrayText[3] -> Columna Total Conceptos
                     * arrayTextLine[i].arrayText[4] -> Columna Saldo Prestamo
                     */

                    // SI NO HAY DATOS EN LA TABLA 1 o 2
                    if (initAcc + 1 === endAcc || initDed + 1 === endDed || initAcc === -1 || initDed === -1) {
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
                    // let confidenceDevengo2 = 0;
                    let totalDatosDevengo = 0;
                    // let totalDatosDevengo2 = 0;
                    let confidenceDeduccion = 0;
                    // let confidenceDeduccion2 = 0;
                    let totalDatosDeduccion = 0;
                    // let totalDatosDeduccion2 = 0;


                    // CAPTURA DE SUBTOTALES DEVENGO Y DEDUCCION
                    try {
                        // DEVENGO
                        if (arrayTextLine[endAcc]?.arrayText[0]?.text.toUpperCase().startsWith("TOTAL")) {
                            // console.log("capturando neto devengo")
                            client.devengos.subtotal = getNetIncome((endAcc), arrayTextLine);
                        }
                        // DEDUCCION
                        if (arrayTextLine[endDed]?.arrayText[0]?.text.toUpperCase().startsWith("TOTAL")) {
                            // console.log("capturando neto descuento")
                            client.deducciones.subtotal = getNetIncome((endDed), arrayTextLine);
                        }
                    } catch (error) {
                        console.log("Error controlado en captura de subtotales");
                        console.log(error);
                    }

                    if (client.devengos.subtotal === null) {
                        client.devengos.subtotal = "0";
                    }
                    if (client.deducciones.subtotal === null) {
                        client.deducciones.subtotal = "0";
                    }
                    if (client.sueldoNeto === null) {
                        client.sueldoNeto = "0";
                    }

                    console.log("-------------------------------------------- HEADER COLUMNS DEVENGO")
                    console.log(arrayTextLine[initAcc]);

                    console.log("\n-------------------------------------------- HEADER COLUMNS DESCUENTO")
                    console.log(arrayTextLine[initDed]);


                    console.log("\n-------------------------------------------- LEFT REFERENCES")
                    let leftAcc = 0;
                    let leftCantidadAcc = 0;
                    let leftBaseAcc = 0;
                    let leftConceptosAcc = 0;
                    let leftSaldoAcc = 0;

                    let leftDed = 0;
                    let leftCantidadDed = 0;
                    let leftBaseDed = 0;
                    let leftConceptosDed = 0;
                    let leftSaldoDed = 0;

                    console.log("receivedleft: " + leftReceived)

                    // RFERENCIAS LEFT
                    try {

                        // left devengos
                        leftAcc = arrayTextLine[initAcc]?.arrayText[0]?.text.toUpperCase().startsWith("DEVENGADOS") ?
                            arrayTextLine[initAcc]?.arrayText[0]?.left : arrayTextLine[initAcc]?.arrayText[1]?.left;

                        leftCantidadAcc = arrayTextLine[initAcc]?.arrayText[1]?.text.toUpperCase().startsWith("CANTID") ?
                            arrayTextLine[initAcc]?.arrayText[1]?.left : arrayTextLine[initAcc]?.arrayText[2]?.left;

                        leftBaseAcc = arrayTextLine[initAcc]?.arrayText[2]?.text.toUpperCase().startsWith("BASE") ?
                            arrayTextLine[initAcc]?.arrayText[2]?.left : arrayTextLine[initAcc]?.arrayText[3]?.left;

                        leftConceptosAcc = arrayTextLine[initAcc]?.arrayText[3]?.text.toUpperCase().startsWith("TOTAL") ?
                            arrayTextLine[initAcc]?.arrayText[3]?.left : arrayTextLine[initAcc]?.arrayText[4]?.left;

                        leftSaldoAcc = arrayTextLine[initAcc]?.arrayText[4]?.text.toUpperCase().startsWith("SALDO") ?
                            arrayTextLine[initAcc]?.arrayText[4]?.left : arrayTextLine[initAcc]?.arrayText[5]?.left;

                        // left deducciones
                        leftDed = arrayTextLine[initAcc]?.arrayText[0]?.text.toUpperCase().startsWith("DEVENGADOS") ?
                            arrayTextLine[initAcc]?.arrayText[0]?.left : arrayTextLine[initAcc]?.arrayText[1]?.left;

                        leftCantidadDed = arrayTextLine[initAcc]?.arrayText[1]?.text.toUpperCase().startsWith("CANTID") ?
                            arrayTextLine[initAcc]?.arrayText[1]?.left : arrayTextLine[initAcc]?.arrayText[2]?.left;

                        leftBaseDed = arrayTextLine[initAcc]?.arrayText[2]?.text.toUpperCase().startsWith("BASE") ?
                            arrayTextLine[initAcc]?.arrayText[2]?.left : arrayTextLine[initAcc]?.arrayText[3]?.left;

                        leftConceptosDed = arrayTextLine[initAcc]?.arrayText[3]?.text.toUpperCase().startsWith("TOTAL") ?
                            arrayTextLine[initAcc]?.arrayText[3]?.left : arrayTextLine[initAcc]?.arrayText[4]?.left;

                        leftSaldoDed = arrayTextLine[initAcc]?.arrayText[4]?.text.toUpperCase().startsWith("SALDO") ?
                            arrayTextLine[initAcc]?.arrayText[4]?.left : arrayTextLine[initAcc]?.arrayText[5]?.left;


                    } catch (error) {
                        console.log("Error controlado en captura de referencias left");
                        console.log(error);
                    }


                    // RECORRIDO DE TABLA DEVENGOS
                    if (initAcc === -1 || initDed === -1 || leftAcc === 0 || leftCantidadAcc === 0 || leftBaseAcc === 0
                        || leftConceptosAcc === 0 || leftSaldoAcc === 0 || leftDed === 0 || leftCantidadDed === 0 || leftBaseDed === 0
                        || leftConceptosDed === 0 || leftSaldoDed === 0) {
                        console.log("\n --------- INDICES DE LA TABLA DEVENGOS INCORRECTOS ---------\n")
                    } else {
                        for (let i = initAcc + 1; i < endAcc; i++) {
                            arrayTextLine[i].arrayText.map(x => {
                                let conceptoCodigo = "N/A";
                                let concepto = "";
                                let unidades = "";
                                let precio = "N/A";
                                let devengo = "";

                                // Concepto + Codigo
                                if (x.left < leftAcc) {
                                    if (arrayTextLine[i]?.arrayText[1]?.left >= leftCantidadAcc) {
                                        // concepto = arrayTextLine[i]?.arrayText[0]?.text.replace(/[\d]+/g, "").trim();
                                        concepto = arrayTextLine[i]?.arrayText[0]?.text.split(" ").slice(1).join(" ")
                                        conceptoCodigo = arrayTextLine[i]?.arrayText[0]?.text.split(" ").shift();
                                        // conceptoCodigo = arrayTextLine[i]?.arrayText[0]?.text.replace(/\D/g, "");
                                    } else {
                                        concepto = arrayTextLine[i]?.arrayText[1]?.text;
                                        conceptoCodigo = arrayTextLine[i]?.arrayText[0]?.text;
                                    }

                                    //  Concepto otra linea
                                    if (concepto && arrayTextLine[i + 1]?.arrayText[0]?.left > leftReceived && arrayTextLine[i + 1]?.arrayText[0]?.left < leftAcc) {
                                        concepto = concepto.concat(" " + arrayTextLine[i + 1]?.arrayText[0]?.text)
                                    }

                                    let elementConcepto = { concepto }
                                    let elementConceptoCodigo = { conceptoCodigo }
                                    elementDevengos = Object.assign({}, elementConceptoCodigo, elementConcepto);
                                }

                                // Precio
                                if (x.left >= leftBaseAcc && x.left < leftConceptosAcc) {
                                    // console.log(x.text);
                                    precio = x.text;
                                    elementDevengos.precio = precio;
                                } else if (!elementDevengos.precio) {
                                    elementDevengos.precio = precio;
                                }

                                // Cantidad
                                if (x.left > leftAcc && x.left < leftBaseAcc) {
                                    // console.log(x.text)
                                    // unidades = x.text.replace(/\D/g, "");
                                    unidades = parseFloat(x.text).toString();
                                    elementDevengos.unidades = unidades;
                                } else if (!elementDevengos.unidades) {
                                    elementDevengos.unidades = "0";
                                }

                                // Devengo
                                if (x.left > leftConceptosAcc && x.left < leftSaldoAcc) {
                                    // console.log(x.text);
                                    devengo = x.text;
                                    elementDevengos.devengo = devengo;
                                }

                                if (devengo) {
                                    confidenceDevengo += x.confidence;
                                    totalDatosDevengo++;
                                    client.devengos.list.push(elementDevengos);
                                    client.devengos.confidence = (
                                        confidenceDevengo / totalDatosDevengo
                                    ).toFixed(2);
                                }

                            })
                        }
                    }

                    // RECORRIDO DE TABLA DEDUCCIONES
                    if (initDed === -1 || leftDed === 0 || leftCantidadDed === 0 || leftBaseDed === 0 || leftConceptosDed === 0 || leftSaldoDed === 0) {
                        console.log("\n --------- INDICES DE LA TABLA DEDUCCIONES INCORRECTOS ---------\n")
                    } else {
                        for (let i = initDed + 1; i < endDed; i++) {
                            arrayTextLine[i].arrayText.map(x => {
                                let conceptoCodigo = "N/A";
                                let concepto = "";
                                let unidades = "";
                                let precio = "N/A";
                                let deduccion = "";

                                // Concepto + Codigo
                                if (x.left < leftDed) {
                                    // console.log(arrayTextLine[i])
                                    if (arrayTextLine[i]?.arrayText[1]?.left >= leftCantidadDed) {
                                        // console.log("JOIN")
                                        // concepto = arrayTextLine[i]?.arrayText[0]?.text.replace(/[\d]+/g, "").trim();
                                        // conceptoCodigo = arrayTextLine[i]?.arrayText[0]?.text.replace(/\D/g, "");
                                        concepto = arrayTextLine[i]?.arrayText[0]?.text.split(" ").slice(1).join(" ")
                                        conceptoCodigo = arrayTextLine[i]?.arrayText[0]?.text.split(" ").shift();
                                    } else {
                                        concepto = arrayTextLine[i]?.arrayText[1]?.text;
                                        conceptoCodigo = arrayTextLine[i]?.arrayText[0]?.text;
                                    }

                                    //  Concepto otra linea
                                    if (concepto && arrayTextLine[i + 1]?.arrayText[0]?.left > leftReceived && arrayTextLine[i + 1]?.arrayText[0]?.left < leftDed) {
                                        concepto = concepto.concat(" " + arrayTextLine[i + 1]?.arrayText[0]?.text)
                                    }

                                    let elementConcepto = { concepto }
                                    let elementConceptoCodigo = { conceptoCodigo }
                                    elementDeducciones = Object.assign({}, elementConceptoCodigo, elementConcepto);
                                }

                                // Precio
                                if (x.left >= leftBaseDed && x.left < leftConceptosDed) {
                                    // console.log(x.text);
                                    precio = x.text;
                                    elementDeducciones.precio = precio;
                                } else if (!elementDeducciones.precio) {
                                    elementDeducciones.precio = precio;
                                }

                                // Cantidad
                                if (x.left > leftDed && x.left < leftBaseDed) {
                                    // console.log(x.text)
                                    // unidades = x.text.replace(/\D/g, "");
                                    unidades = parseFloat(x.text).toString();
                                    elementDeducciones.unidades = unidades;
                                } else if (!elementDeducciones.unidades) {
                                    elementDeducciones.unidades = "0";
                                }

                                // Devengo
                                if (x.left > leftConceptosDed && x.left < leftSaldoDed) {
                                    // console.log(x.text);
                                    deduccion = x.text;
                                    elementDeducciones.deduccion = deduccion;
                                }

                                if (deduccion) {
                                    confidenceDeduccion += x.confidence;
                                    totalDatosDeduccion++;
                                    client.deducciones.list.push(elementDeducciones);
                                    client.deducciones.confidence = (
                                        confidenceDeduccion / totalDatosDeduccion
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
                        resultArr.push({ client: resultObject.client, company: resultObject.company })
                        resultArr.push({ client: resultObject.client2, company: resultObject.company2 })
                    } else {
                        resultObject = { client, company };
                        resultArr.push(resultObject)
                    }

                    console.log(resultObject)
                    // arrayTextLine.map(x => { console.log(x) })

                    jsonToRead ? resolve(resultArr) : resolve(false);
                })();
            }
        } catch (error) {
            console.log("ERROR");
            console.log(error);
            resolve(false);
        }
    });

module.exports = { readPaymentgSupport };
