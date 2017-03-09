const Immutable = require('immutable')

const { insertarVenta, updateVenta } = require('../../api.js')
const DateParser = require('../../DateParser.js')
const {
  crearVentaRow,
  facturableAUnidad,
  productoAFacturable } = require('./Models.js')
const {
  esFacturablePropValido,
  esFacturaDataPropValido,
  validarVentaRow } = require('../../Validacion.js')

const getDefaultState = () => {
  return {
    cliente: null,
    medico: null,
    errors: Immutable.Map(),
    facturaData: Immutable.Map({
      codigo: '',
      fecha: new Date(),
      descuento: '',
      autorizacion: '',
      formaPago: '',
    }),
    facturables: Immutable.List(),
  }
}

const agregarProductoComoFacturable = (producto) => {
  return (prevState) => {
    const facturable = Immutable.Map(productoAFacturable(producto))
    return { facturables: prevState.facturables.push(facturable) }
  }
}

const convertirFacturablesAUnidades = (facturablesImm) => {
  return facturablesImm.map((facturableImm) => {
    return facturableAUnidad(facturableImm.toJS())
  })
}

const crearGuardarPromiseYMensaje = (editar, ventaRow) => {
  if (editar) {
    return {
      errors: null,
      prom: updateVenta(ventaRow),
      msg: 'La factura se editó exitosamente.',
      ventaRow,
    }
  } else {
    return {
      errors: null,
      prom: insertarVenta(ventaRow),
      msg: 'La factura se generó exitosamente.',
      ventaRow,
    }
  }
}

const editarFacturaExistente = (verVentaResp) => {
  const resp = DateParser.verVenta(verVentaResp.body)
  return () => {
    return {
      cliente: resp.cliente,
      facturaData: Immutable.fromJS(resp.facturaData),
      facturables: Immutable.fromJS(resp.facturables),
    }
  }
}

const modificarValorEnFacturable = (index, propKey, newPropValue) => {
  if (esFacturablePropValido(propKey, newPropValue)) {
    return (prevState) => {
      const facturables = prevState.facturables
      const updatedFacturables = facturables.update(index,
        (facturable) => facturable.set(propKey, newPropValue))
      return { facturables: updatedFacturables }
    }
  }
  return null
}

const modificarValorEnFacturaData = (dataKey, newDataValue) => {
  if(!esFacturaDataPropValido(dataKey, newDataValue))
    return null;
  return (prevState) => {
    return { facturaData: prevState.facturaData.set(dataKey, newDataValue) }
  }
}

const puedeGuardarFactura = (state) => {
  if(!state.cliente) return false
  if(state.facturables.isEmpty()) return false
  return true
}

const prepararFacturaParaGuardar = (state, editar, empresa) => {
  const {
    cliente,
    facturables,
    facturaData,
  } = state

  const unidades = convertirFacturablesAUnidades(facturables)
  const ventaRow = crearVentaRow(cliente, facturaData, facturables, unidades,
    empresa)
  const { errors } = validarVentaRow(ventaRow)
  if (errors)
    return { errors, prom: null, msg: null, ventaRow: null }
  else
    return crearGuardarPromiseYMensaje(editar, ventaRow)
}

const removeFacturableAt = (index) => {
  return (prevState) => {
    return { facturables: prevState.facturables.remove(index) }
  }
}

module.exports = {
  agregarProductoComoFacturable,
  editarFacturaExistente,
  getDefaultState,
  modificarValorEnFacturaData,
  modificarValorEnFacturable,
  puedeGuardarFactura,
  prepararFacturaParaGuardar,
  removeFacturableAt,
}