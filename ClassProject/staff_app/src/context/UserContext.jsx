import { createContext, useReducer } from "react";
import UserReducer from "../reducers/UserReducer";

export const UserContext = createContext({
    currentuser: null,
    setcurrentuser: () => null
});

const INITIAL_STATE = {
    currentUser: null
};

export function UserProvider({ children }) {

    const [{ currentUser }, dispatch] = useReducer(
        UserReducer,
        INITIAL_STATE
    );

    const setcurrentuser = (user) => {
        dispatch({
            type: 'SET_CURRENT_USER',
            payload: user
        });
    };

    const value = {
        currentuser: currentUser,
        setcurrentuser
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}