import React, {Component, PropTypes} from 'react';

import Add from 'material-ui/svg-icons/content/add';
import Drawer from 'material-ui/Drawer';
import {Toolbar, ToolbarGroup, ToolbarTitle } from 'material-ui';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import IconMenu from 'material-ui/IconMenu';
import MenuItem from 'material-ui/MenuItem';
import IconButton from 'material-ui/IconButton';
import Snackbar from 'material-ui/Snackbar';
import NavigationMenu from 'material-ui/svg-icons/navigation/menu';


import { bindActionCreators } from 'redux';
import { connect, Provider } from 'react-redux'

import { NUEVO_CLIENTE_DIALOG,
  NUEVO_PRODUCTO_DIALOG,
  NUEVO_MEDICO_DIALOG,
  NUEVO_CLIENTE_DIALOG_CLOSED,
  NUEVO_MEDICO_DIALOG_CLOSED,
  NUEVO_PRODUCTO_DIALOG_CLOSED } from '../DialogTypes'
import { NEW_FACTURA_PAGE, EDITAR_FACTURA_PAGE, NEW_FACTURA_EXAMEN_PAGE,
  EDITAR_FACTURA_EXAMEN_PAGE, FACTURA_LIST_PAGE } from '../PageTypes'

import ActionCreators from '../ActionCreators'
import CustomStyle from '../CustomStyle'
import {NuevaFacturaPage, EditarFacturaPage, NuevaFacturaExamenPage,
  EditarFacturaExamenPage} from './Factura/Variantes'
import NuevoClienteDialog from './NuevoCliente/NuevoClienteDialog'
import NuevoProductoDialog from './NuevoProducto/NuevoProductoDialog'
import NuevoMedicoDialog from './NuevoMedico/NuevoMedicoDialog'
import FacturasListView from './FacturasList/FacturasListView'
import store from '../Store'

const toolbarTextColor = '#FFFFFF'
const toolbarTitleStyle = {
  color: toolbarTextColor,
  fontFamily: 'Roboto',
}

function mapStateToProps(state) {
  return {
    dialog: state.dialog,
    ajustes: state.ajustes,
    snackbar: state.snackbar,
    page: state.page,
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(ActionCreators, dispatch);
}


const MainDrawer = (props) => {

  const cp = (page) => {
    props.onPageSelected(page)
  }

  return (
    <Drawer
      docked={false}
      width={200}
      open={props.open}
      onRequestChange={props.handleChange}>
      <MenuItem onTouchTap={() => cp(NEW_FACTURA_PAGE)}>Nueva Factura</MenuItem>
      <MenuItem onTouchTap={() => cp(NEW_FACTURA_EXAMEN_PAGE)}>Nueva Factura Examenes</MenuItem>
      <MenuItem onTouchTap={() => cp(FACTURA_LIST_PAGE)}>Ver Facturas</MenuItem>
    </Drawer>
  )
}

class MainSnackbar extends React.Component {

  shouldComponentUpdate(nextProps) {
    if (this.props.data !== nextProps.data) return true
    return false
  }

  render () {
    const data = this.props.data
    let action, message, open, onActionTouchTap
    if (data) {
      open = true
      message = data.message
      if (data.link) {
        action = "ABRIR"
        onActionTouchTap = () => window.open(data.link)
      }
    } else {
      open = false
      message = ''
    }

    return (
      <Snackbar open={open} message={message} action={action}
      onActionTouchTap={onActionTouchTap} autoHideDuration={12000}/>
    )
  }
}

class MainToolbar extends Component {

  getIconStyles(props, context) {
    const {
      appBar,
      toolbar,
      button: {
        iconButtonSize,
      },
    } = context.muiTheme;

    const flatButtonSize = 36;

    const styles = {
      iconButtonStyle: {
        marginTop: (toolbar.height - iconButtonSize) / 2,
        marginRight: 8,
        marginLeft: -16,
      },
      iconButtonIconStyle: {
        fill: appBar.textColor,
        color: appBar.textColor,
      },
      flatButton: {
        color: appBar.textColor,
        marginTop: (iconButtonSize - flatButtonSize) / 2 + 1,
      },
    };

    return styles;
  }

  static contextTypes = {
    muiTheme: PropTypes.object.isRequired,
  };

  render() {

    const {
      iconButtonStyle,
      iconButtonIconStyle,
    } = this.getIconStyles(this.props, this.context)

    const {
      cambiarDialog,
      title,
      onLeftButtonClicked,
    } = this.props

    return (
      <Toolbar style={{backgroundColor: CustomStyle.muiTheme.palette.primary1Color}}>

        <ToolbarGroup>
          <IconButton style={iconButtonStyle} iconStyle={iconButtonIconStyle}
            onTouchTap={onLeftButtonClicked}>
            <NavigationMenu />
          </IconButton>
          <ToolbarTitle text={title}
          style={toolbarTitleStyle}/>
        </ToolbarGroup>

        <ToolbarGroup>
          <IconMenu iconButtonElement={
            <IconButton touch={true} style={iconButtonStyle} iconStyle={iconButtonIconStyle}>
              <Add />
            </IconButton> }
            targetOrigin={{horizontal: 'right', vertical: 'top'}}
            anchorOrigin={{horizontal: 'right', vertical: 'bottom'}}>
            <MenuItem primaryText="Nuevo Producto" onTouchTap={() =>
              cambiarDialog(NUEVO_PRODUCTO_DIALOG)}/>
            <MenuItem primaryText="Nuevo Cliente" onTouchTap={() =>
              cambiarDialog(NUEVO_CLIENTE_DIALOG)}/>
            <MenuItem primaryText="Nuevo Medico" onTouchTap={() =>
              cambiarDialog(NUEVO_MEDICO_DIALOG)}/>
          </IconMenu>
        </ToolbarGroup>

      </Toolbar>
    )
  }
}

class MainDialog extends Component {
  render() {
    const {
      type,
      cambiarDialog,
      cerrarDialogConMsg,
    } = this.props

    if(!type)
      return (
        <div />
      )
    else if (type === NUEVO_CLIENTE_DIALOG || type === NUEVO_CLIENTE_DIALOG_CLOSED)
      return (
        <NuevoClienteDialog open={ type === NUEVO_CLIENTE_DIALOG }
          cambiarDialog={cambiarDialog}
          cerrarDialogConMsg={cerrarDialogConMsg} />
      )
    else if (type === NUEVO_PRODUCTO_DIALOG || type === NUEVO_PRODUCTO_DIALOG_CLOSED)
      return (
        <NuevoProductoDialog open={ type === NUEVO_PRODUCTO_DIALOG }
          cambiarDialog={cambiarDialog}
          cerrarDialogConMsg={cerrarDialogConMsg} />
      )
    else if (type === NUEVO_MEDICO_DIALOG || type === NUEVO_MEDICO_DIALOG_CLOSED)
      return (
        <NuevoMedicoDialog open={ type === NUEVO_MEDICO_DIALOG }
          cambiarDialog={cambiarDialog}
          cerrarDialogConMsg={cerrarDialogConMsg} />
      )
    else throw Error('Tipo de dialog desconocido')
  }
}

const SelectedPage = (props) => {
  const {
    abrirLinkConSnackbar,
    ajustes,
    page,
    editarFactura,
    editarFacturaExamen,
  } = props

  const pageProps = { ...page.props, ajustes }

  switch (page.type) {
    case NEW_FACTURA_PAGE:
      return <NuevaFacturaPage abrirLinkConSnackbar={abrirLinkConSnackbar}
        {...pageProps}/>
    case EDITAR_FACTURA_PAGE:
      return <EditarFacturaPage abrirLinkConSnackbar={abrirLinkConSnackbar}
        {...pageProps}/>
    case NEW_FACTURA_EXAMEN_PAGE:
      return <NuevaFacturaExamenPage abrirLinkConSnackbar={abrirLinkConSnackbar}
        {...pageProps}/>
    case EDITAR_FACTURA_EXAMEN_PAGE:
      return <EditarFacturaExamenPage abrirLinkConSnackbar={abrirLinkConSnackbar}
        {...pageProps}/>
    case FACTURA_LIST_PAGE:
      return <FacturasListView editarFactura={editarFactura}
        editarFacturaExamen={editarFacturaExamen} {...pageProps}/>
    default:
      return null
  }
}

class Main extends Component {

  constructor(props) {
    super(props);
    this.state = {
      drawerOpen: false,
    };
  }

  handleDrawerChange = (value) => {
    this.setState({
      drawerOpen: value,
    });
  };

  onPageSelected = (newPage) => {
    this.setState({
      drawerOpen: false,
    })
    this.props.cambiarPagina(newPage, {})
  }

  render() {
    const {
      abrirLinkConSnackbar,
      editarFactura,
      editarFacturaExamen,
      cambiarDialog,
      cerrarDialogConMsg,
      dialog,
      ajustes,
      snackbar,
      page,
    } = this.props

    return (
      <div style={{backgroundColor: '#ededed', height: 'inherit'}}>
        <MainToolbar cambiarDialog={cambiarDialog} title={ajustes.empresa}
        onLeftButtonClicked={() => this.handleDrawerChange(true)}/>
        <SelectedPage page={page} editarFactura={editarFactura} ajustes={ajustes}
          editarFacturaExamen={editarFacturaExamen} abrirLinkConSnackbar={abrirLinkConSnackbar}/>
        <MainDrawer open={this.state.drawerOpen} handleChange={this.handleDrawerChange}
          onPageSelected={this.onPageSelected}/>
        <MainDialog type={dialog} cambiarDialog={cambiarDialog}
          cerrarDialogConMsg={cerrarDialogConMsg}/>
        <MainSnackbar data={snackbar}/>
      </div>
    )
  }
}
/**
* This component is meant to be the root container of your app. You should
* render it in a div that is the only child of the body tag. That div should
* have this style: "height: 100%; width: 100%; position: fixed"
* If these conditions are not met, the component may fail to acquire the
* whole space of the window, and consequently, The components inside the tabs
* won't get 100% of the height available. If the component depends on having
* all  height available it won't render properly.
*/
export default class MainNavigationView extends Component {

  render() {
    const MainComponent = connect(mapStateToProps, mapDispatchToProps) (Main)

    return (
      <MuiThemeProvider muiTheme={CustomStyle.muiTheme}>
        <Provider store={store} >
          <MainComponent />
        </Provider>
      </MuiThemeProvider>
    );
  }
}
