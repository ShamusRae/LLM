import React from 'react';

const Logo = ({ className = "h-14 w-14" }) => {
  return (
    <img src="/rovesg-logo.png" alt="Rovesg" className={className} />
  );
};

export default Logo; 