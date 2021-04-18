/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
import Vue from 'vue'
import Vuex from 'vuex'
import axios from './axios-auth'  // for REST into Firebase auth
import globalAxios from 'axios'   // for REST into Firebase RTDB

import router from './router'

import firebaseConfig from './gcp.js';

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    idToken: null,
    userId: null,
    user: null,
    pause: true,
    pauseSrc: undefined,
    view: ['Innovator', 'Automator', 'Monetizer'],
    viewId: 0,
    actionCall: ['Ideate', 'Automate', 'Monetize'],
    actionCallId: 0
  },
  mutations: {
    nextView(state) {
      state.viewId++;
      state.actionCallId++;
      state.viewId = state.viewId % state.view.length;
      state.actionCallId = state.actionCallId % state.actionCall.length;
    },
    togglePause(state, params) {
      state.pause = params.value;
      state.pauseSrc = params.src;
    },
    authUser (state, userData) {
      state.idToken = userData.token
      state.userId = userData.userId
    },
    storeUser (state, user) {
      state.user = user
    },
    clearAuthData (state) {
      state.idToken = null
      state.userId = null
    }
  },
  actions: {
    setLogoutTimer ({commit}, expirationTime) {
      setTimeout(() => {
        commit('clearAuthData')
        router.replace('/signin')
      }, expirationTime * 1000) // * 1000 for milliseconds
    },
    signup ({commit, dispatch}, authData) {
      // build signUp string for GCP/Firebase REST API
      const signUpString = '/accounts:signUp?key=' 
      + firebaseConfig.options_.apiKey;
      axios.post(signUpString, {
        email: authData.email,
        password: authData.password,
        returnSecureToken: true
      })
        .then(res => {
          // console.log(res)
          // commit to Vuex store
          commit('authUser', {
            token: res.data.idToken,
            userId: res.data.localId
          })
          // store session details in local Storage for Auto Login if token is not expired
          const now = new Date()
          const expirationDate = new Date(now.getTime() + res.data.expiresIn * 1000)
          localStorage.setItem('token', res.data.idToken)
          localStorage.setItem('userId', res.data.localId)
          localStorage.setItem('expirationDate', expirationDate)
          // store User in Firebase RTDB
          dispatch('storeUser', authData)
          router.replace('/dashboard')
          dispatch('setLogoutTimer', res.data.expiresIn)
        })
        .catch(error => console.log(error));
    },
    login ({commit, dispatch}, authData) {
      // build signIn string for GCP/Firebase REST API
      const signInString = '/accounts:signInWithPassword?key=' 
      + firebaseConfig.options_.apiKey;
      axios.post(signInString, {
        email: authData.email,
        password: authData.password,
        returnSecureToken: true
      })
      .then(res => {
        // console.log(res)
        // store session details in local Storage for Auto Login if token is not expired
        const now = new Date()
        const expirationDate = new Date(now.getTime() + res.data.expiresIn * 1000)
        localStorage.setItem('token', res.data.idToken)
        localStorage.setItem('userId', res.data.localId)
        localStorage.setItem('expirationDate', expirationDate)
        commit('authUser', {
          token: res.data.idToken,
          userId: res.data.localId
        })
        router.replace('/dashboard')
        dispatch('setLogoutTimer', res.data.expiresIn)
      })
      .catch(error => console.log(error));
    },
    tryAutoLogin ({commit}) {
      const token = localStorage.getItem('token')
      if (!token) {
        return
      }
      const expirationDate = localStorage.getItem('expirationDate')
      const now = new Date()
      if (now >= expirationDate) {  // token expired
        return
      }
      // if not returned so far we have a valid not expired token
      const userId = localStorage.getItem('userId')
      commit('authUser', {
        token: token,
        userId: userId
      })
    },
    logout ({commit}) {
      commit('clearAuthData')
      localStorage.removeItem('expirationDate')
      localStorage.removeItem('token')
      localStorage.removeItem('userId')
      router.replace('/signin')
    },
    // store user in Firebase RTDB
    storeUser ({commit, state}, payload) {
      if (!state.idToken) {
        return
      }

      // Milan's Answer to storing/fetching user data - Safer with no Pass storing! 
      const userData = {
        age: payload.age,
        country: payload.country,
        email: payload.email,
        interests: payload.interests
      }

      // globalAxios.post('/users.json' + '?auth=' + state.idToken, userData) // Max course code
      // Bellow Milan's Answer to storing/fetching user data
      globalAxios.put(`users/${state.userId}.json?auth=${state.idToken}`, userData)
        .then(res => console.log(res))
        .catch(error => console.log(error))
    },
    // fetch user data from Firebase RTDB
    // Milan's Answer to storing/fetching user data
    fetchUser: ({ commit, state }) => {
      if (!state.idToken) {
        return
      }
 
      globalAxios
        .get(`users/${state.userId}.json?auth=${state.idToken}`)
        .then(({ data }) => {
          commit("storeUser", data)
        })
        .catch(error => console.error(error))
    }

    // Max Vue Code 361 - 363
    // fetchUser ({commit, state}) {
    //   if (!state.idToken) {
    //     return
    //   }
    //   globalAxios.get('/users.json' + '?auth=' + state.idToken)
    //   .then(res => {
    //     // console.log(res);
    //     const data = res.data
    //     const users = []
    //     for (let key in data) {
    //       const user = data[key]
    //       user.id = key
    //       users.push(user)
    //     }
    //     // console.log(users)
    //     // this.email = users[0].email
    //     commit('storeUser', users[0])
    //   })
    //   .catch(error => console.log(error))
    // }
  },
  getters: {
    actionCall(state) {
      return state.actionCall[state.actionCallId];
    },
    view(state) {
      return state.view[state.viewId];
    },
    viewId(state) {
      return state.viewId;
    },
    isPaused(state) {
      return state.pause;
    },
    pauseSrc(state) {
      return state.pauseSrc;
    },
    user (state) {
      return state.user
    },
    isAuthenticated (state) {
      return state.idToken !== null
    }
  }
})