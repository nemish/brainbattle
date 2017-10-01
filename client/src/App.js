import React, { PureComponent, Component } from 'react';
import { connect } from 'react-redux';
import './App.css';
import {
    fetchChallenge,
    fetchCurrentUser,
    userNameChange,
    LOGIN_FORM,
    formsActions,
    checkUserName,
    registerUser,
    createChallenge
} from './actions/index';
import { bindActionCreators } from 'redux';
import { withStyles } from 'material-ui/styles';
import Cookies from 'js-cookie';
import { withRouter } from 'react-router';
import { Route, Link } from 'react-router-dom';
import Challenge from './Challenge';
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import TextField from 'material-ui/TextField';
import Button from 'material-ui/Button';
import Board from './Board';
// import io from 'socket.io-client';
// const  socket = io();

const loginFormActions = formsActions[LOGIN_FORM];


const styles = theme => ({
  paper: theme.mixins.gutters({
    paddingTop: 16,
    paddingBottom: 16,
    marginTop: theme.spacing.unit * 3,
  })
});


class App extends PureComponent {
    componentDidMount() {
        const userId = sessionStorage.getItem('current_user');
        if (userId && userId !== 'undefined') {
            this.props.fetchCurrentUser({user_id: userId});
        } else {
            this.props.history.push('/');
        }
    }

    render() {
        if (this.props.loading) {
            return <div>Loading</div>
        }
        const { match } = this.props;
        return <div className='app-container'>
            <Grid container style={{height: '100%'}}>
                <Route path="/board" component={Board} />
                <Route path="/challenge/:challengeId" component={Challenge} />
                <Route exact path={match.url} render={() => <WelcomeConnected />}/>
            </Grid>
        </div>
    }
}


export default connect(
    state => state.user.userData,
    dispatch => bindActionCreators({ fetchCurrentUser }, dispatch)
)(App);


class Welcome extends PureComponent {
    componentWillReceiveProps(nextProps) {
        if (nextProps.userId) {
            this.props.history.push('board');
        }
    }

    render() {
        return <UserLoginConnected />
    }
}


const WelcomeConnected = connect(
    state => ({
        userId: state.user.userData._id
    })
)(withRouter(Welcome));





class UserLogin extends PureComponent {
    render() {
        let name = null;
        let passwdElem = null;
        if (this.props.name && this.props.name.length) {
            name = this.props.check.loading ? 'Wait please...' : this.props.name
            if (this.props.check.data.status === 'occupied') {
                name += ' - occupied. Please log in';
                passwdElem = <Grid item>
                    <Password fieldName='passwd' {...this.props} />
                </Grid>
            } else if (this.props.check.data.status === 'ok') {
                name += ' - type password in to register';
                passwdElem = <Grid item>
                    <Password fieldName='passwd' {...this.props} />
                </Grid>
            }
        }
        let nameElem = null;
        if (name) {
            nameElem = <Grid item>
                <h5 className='text-center mono-font'>{name}</h5>
            </Grid>
        }
        return <Grid container align='center' justify='center' style={{height: '100%'}} direction='column'>
            <Grid item>
                <h3 className='text-center'>Introduce yourself</h3>
            </Grid>
            {nameElem}
            <Grid item>
                <form onSubmit={e => e.preventDefault()}>
                    <Grid container>
                        <Grid item xs={10}>
                            <UserNameConnected fieldName='name' {...this.props} />
                        </Grid>
                        <Grid item xs={2} className='text-center'>
                            <LoginButton {...this.props} />
                        </Grid>
                        {passwdElem}
                    </Grid>
                </form>
            </Grid>
        </Grid>
    }
}


const handleRegisterUserStep = props => {
    if (props.name && props.passwd) {
        handleUserRegister(props);
    } else {
        handleUserNameCheck(props);
    }
}


const handleUserNameCheck = (props) => {
    return props.checkUserName({
        name: props.name
    })
}


const handleUserRegister = ({ name, passwd, ...remain }) => {
    return remain.registerUser({
        name,
        passwd
    }).then(data => {
        if (data && data.status === 'ok') {
            sessionStorage.setItem('current_user', data.item._id);
            remain.history.push('/board');
        }
        return data;
    });
}


const LoginButtonDumb = props => {
    const { name } = props.form;
    const disabled = !name || !name.length || props.checkState.loading;
    return <Button
        disabled={disabled}
        raised
        color="primary"
        onClick={() => handleRegisterUserStep(props)}>GO</Button>;
}


const LoginButton = connect(
    state => ({
        form: state.forms[loginFormActions.key],
        checkState: state.user.checkState
    }),
    dispatch => bindActionCreators({
        handleRegisterUserStep
    }, dispatch)
)(withRouter(LoginButtonDumb));


class UserNameField extends Component {
    render() {
        const { onChange, fieldName } = this.props;
        return <TextField
             fullWidth
             value={this.props[fieldName]}
             name={fieldName}
             label="What's your name?"
             maxLength='16'
             minLength='0'
             onChange={onChange}
             onKeyPress={e => {
                if (e.key === 'Enter'){
                    const { value } = e.target;
                    if (!value) {
                        return;
                    }
                    handleRegisterUserStep(this.props);
                }
             }}
             placeholder='Type something in...' />
    }
}


const PasswordField = props => {
    const { onChange, fieldName } = props;
    return <TextField
         fullWidth
         type='password'
         value={props[fieldName]}
         name={fieldName}
         label="Password"
         maxLength='16'
         minLength='0'
         onChange={onChange}
         onKeyPress={e => {
            if (e.key === 'Enter'){
                const { value } = e.target;
                if (!value) {
                    return;
                }
                handleRegisterUserStep(props);
            }
         }}
         placeholder='Type something in...' />
}


const fieldChanger = formsActions => connect(
    (state, ownProps) => ({
        value: state.forms[formsActions.key][ownProps.fieldName]
    }),
    (dispatch, ownProps) => ({
        onChange(e) {
            dispatch(formsActions.changeValue({
                name: ownProps.fieldName,
                value: e.target.value
            }))
        }
    })
)

const UserNameConnected = withRouter(fieldChanger(loginFormActions)(UserNameField));
const Password = withRouter(fieldChanger(loginFormActions)(PasswordField));


const UserLoginConnected = connect(
    state => ({
        check: state.user.checkState,
        ...state.forms[loginFormActions.key],
        ...state.meta
    }),
    dispatch => bindActionCreators({ checkUserName, registerUser }, dispatch)
)(withStyles(styles)(withRouter(UserLogin)));


