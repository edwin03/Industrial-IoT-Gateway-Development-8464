import React from 'react';

const SafeIcon = ({ icon, name, ...props }) => {
  let IconComponent;

  try {
    // Handle direct icon component
    if (icon && typeof icon === 'function') {
      IconComponent = icon;
    }
    // Handle icon name string
    else if (name && typeof name === 'string') {
      // Dynamic import would go here, but for safety we'll use a fallback
      IconComponent = null;
    }
    else {
      IconComponent = null;
    }
  } catch (e) {
    console.warn('Icon loading error:', e);
    IconComponent = null;
  }

  // Fallback icon component
  const FallbackIcon = (props) => (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );

  return IconComponent ? <IconComponent {...props} /> : <FallbackIcon {...props} />;
};

export default SafeIcon;