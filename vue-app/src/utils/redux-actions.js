let store = null;
export const initStore = extStore => {
    store = extStore;
}


export function makeActionCreator(type, ...argNames) {
  return function(...args) {
    let action = { type }
    argNames.forEach((arg, index) => {
      action[argNames[index]] = args[index]
    })
    return action
  }
}


function makeQuery(payload) {
    var esc = encodeURIComponent;
    return Object.keys(payload || {})
        .map(k => `${esc(k)}=${esc(payload[k])}`)
        .join('&');
}


export function createAsyncAction(conf) {
  var startActionCreator = makeActionCreator(conf.startEvent || conf.event + '__START', 'data');
  var successActionCreator = makeActionCreator(conf.successEvent || conf.event + '__SUCCESS', 'data', 'payload');
  var failActionCreator = null;

  let failEvent = conf.failEvent;
  if (!failEvent) {
    failEvent = conf.event + '__FAIL';
  }

  if (failEvent) {
    failActionCreator = makeActionCreator(failEvent, 'data', 'payload');
  }

  function makeRequest(payload) {
    return function (dispatch) {
      dispatch(startActionCreator(payload));
      let url = conf.url;
      let method = conf.method;
      if (typeof url === "function") {
        url = url(payload);
      } else if (conf.graphql) {
        url = 'http://localhost:8080/gql'
      }

      if (typeof method === "function") {
        method = method(payload);
      }

      let params = {
          credentials: 'same-origin',
          mode: 'cors'
      }
      let headers = {};
      if (method == 'post') {
        headers['Content-Type'] = 'application/json; charset=utf-8';
      }
      if (conf.authorized) {
        // const token = localStorage.getItem('jwt_token');
        const { token } = store.getState().user.userData;
        if (token && token.length) {
            headers['Authorization'] = 'Bearer ' + token;
        }
      }

      if (!method || method === 'get') {
        let query = {};
        if (conf.graphql) {
            query = makeQuery({
                query: conf.graphql(payload)
            });
        } else {
            query = makeQuery(payload);
        }
        url = url + (query.length ? '?' + query : '');
      }


      if (method === 'post') {
        params = {
            ...params,
            method: 'POST',
            body: JSON.stringify({
                query: conf.graphql(payload)
            })
        }
      }

      params.headers = headers;

      console.log('createFetchAction', url, params);
      return fetch(url, params)
        .then(resp => {
            if (!resp.ok) {
                return resp.json().then(err => {throw err});
            }
            if (resp.status === 401) {
                localStorage.setItem('jwt_token', null);
                window.location = '/';
            }
            return resp;
        })
        .then(resp => resp.json())
        .then(data => {
            if (data.errors && data.errors.length) {
                return Promise.reject(data.errors);
            }
            dispatch(successActionCreator(data));
            return data;
        })
        .catch(err => {
            if (failEvent) {
                dispatch(failActionCreator(err));
            }
        });
    }
  }
  makeRequest.successAction = successActionCreator
  return makeRequest;
}


export function createGridLoader(conf) {
    return createAsyncAction({
        ...conf,
        startEvent: conf.gridName + '__LOAD__START',
        successEvent: conf.gridName + '__LOAD__SUCCESS',
        failEvent: conf.gridName + '__LOAD__FAIL',
    });
}


export const createGridActions = conf => ({
    fetchItems: createGridLoader(conf),
    handlePageChange: makeActionCreator(conf.gridName + '__PAGE_CHANGE', 'data'),
    handleSortChange: makeActionCreator(conf.gridName + '__SORT_CHANGE', 'data'),
    changeFilterEvent: conf.gridName + '__FILTERS_CHANGE',
    updateDimensions: makeActionCreator(conf.gridName + '__DIMENSIONS_UPDATED', 'data')
});


export const createFormConstants = conf => ({
    saveSuccessEvent: conf.formName + '__SAVE_SUCCESS',
    changeFieldEvent: conf.formName + '__FIELD_CHANGE',
    saveStartEvent: conf.formName + '__SUBMIT__START',
    saveFailEvent: conf.formName + '__SAVE_FAIL',
    addConditionEvent: conf.formName + '__ADD_CONDITION',
    removeConditionEvent: conf.formName + '__REMOVE_CONDITION',
    resetConditionsEvent: conf.formName + '__RESET_CONDITIONS'
});


export const modalConstants = modalName => ({
    open: modalName + '__OPEN',
    close: modalName + '__CLOSE'
})


export const createModalActions = (conf, name) => {
    let constants = conf;
    if (typeof constants === 'string') {
        constants = modalConstants(constants);
    }
    return {
        name,
        open: makeActionCreator(constants.open, 'modalData'),
        close: makeActionCreator(constants.close),
        actions: constants
    }
}


export const createFormActions = (formConf, conf) => {
    return {
        onFormSubmit: createAsyncAction({
            ...conf,
            startEvent: formConf.saveStartEvent,
            successEvent: formConf.saveSuccessEvent,
            failEvent: formConf.saveFailEvent
        }),
        fieldChange: makeActionCreator(formConf.changeFieldEvent, 'data')
    }
}


export const createAsyncActionsConf = actionName => {
    return {
        actionName,
        startEvent: actionName + '__START',
        successEvent: actionName + '__SUCCESS',
        failEvent: actionName + '__FAIL',
    }
}


export const createFormDispatchActions = (formActions, dispatch) => {
    let obj = {};
    Object.keys(formActions).forEach(
        key => obj[key] = data => dispatch(formActions[key](data))
    )
    return obj;
}