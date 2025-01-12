import React, { createContext, useState, useContext } from "react";
import PropTypes from "prop-types"; // Import PropTypes

export const UserContext = createContext(); // Correct naming for context

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
UserProvider.propTypes = {
    children: PropTypes.node.isRequired,
  };
// Correct the export function name to match the convention
