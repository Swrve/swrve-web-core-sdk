import IDictionary from "../../interfaces/IDictionary";

export const SWRVE_TEXT_BUTTON = "text";
export const SWRVE_IMAGE_BUTTON = "image";
export const SWRVE_IAM_OVERLAY = "swrveIAM__overlay";
export const SWRVE_IAM_CANVAS = "swrveIAM__canvas";
export const SWRVE_IAM_BUTTON = "swrveIAM__button";
export const SWRVE_IAM_IMAGE = "swrveIAM__image";
export const SWRVE_IAM_BUTTON_CLICK_EVENT = "swrve-iam-button-click";
export const enum Animation {
  none = "none",
  fadeInDown = "fadeInDown",
  fadeInRight = "fadeInRight",
  fadeInLeft = "fadeInLeft",
  fadeInUp = "fadeInUp",
  bounceInDown = "bounceInDown"
}
export const enum Position {
  center = "center",
  bottom = "bottom",
  top = "top",
  bottomLeft = "bottomLeft",
  bottomRight = "bottomRight",
  topLeft = "topLeft",
  topRight = "topRight",
}

export const DEFAULT_IAM_TEXT_BACKGROUND_COLOR = 'transparent';
export const DEFAULT_IAM_TEXT_FOREGROUND_COLOR = '#000000';
export const DEFAULT_IAM_TEXT_FONT = 'Arial';
const DEFAULT_HOVER_STYLE = {
  opacity: "60%",
};
export const SWRVE_IAM_DEFAULT_ENTER_ANIMATION = "fadeInDown"; //TODO: should be none
export const SWRVE_IAM_DEFAULT_POSITION = "center";
export const SWRVE_IAM_POSITIONS = {
  center: `
    .${SWRVE_IAM_OVERLAY} {
      justify-content: center;
      align-items: center;
    }
  `,
  bottom: `
    .${SWRVE_IAM_OVERLAY} {
      justify-content: center;
      align-items: end;
    }
  `,
  top: `
    .${SWRVE_IAM_OVERLAY} {
      justify-content: center;
      align-items: baseline;
    }
  `,
  bottomRight: `
    .${SWRVE_IAM_OVERLAY} {
      justify-content: end;
      align-items: end;
    }

    .${SWRVE_IAM_CANVAS} {
      margin: 20px;
    }
  `,
  topRight: `
    .${SWRVE_IAM_OVERLAY} {
      justify-content: end;
      align-items: baseline;
    }

    .${SWRVE_IAM_CANVAS} {
      margin: 20px;
    }
  `,
  bottomLeft: `
    .${SWRVE_IAM_OVERLAY} {
      justify-content: start;
      align-items: end;
    }

    .${SWRVE_IAM_CANVAS} {
      margin: 20px;
    }
  `,
  topLeft: `
    .${SWRVE_IAM_OVERLAY} {
      justify-content: start;
      align-items: baseline;
    }

    .${SWRVE_IAM_CANVAS} {
      margin: 20px;
    }
  `,
};
export const SWRVE_IAM_ENTER_ANIMATIONS = {
  fadeInDown: {
    className: "fadeInDown",
    templateLiteral: `
      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translate3d(0, -100%, 0);
        }

        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }

      .fadeInDown {
        animation-name: fadeInDown;
        animation-duration: 1.5s;
      }
    `,
  },
  fadeInLeft: {
    className: "fadeInLeft",
    templateLiteral: `
      @keyframes fadeInLeft {
        from {
          opacity: 0;
          transform: translate3d(-2000px, 0, 0);
        }

        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }

      .fadeInLeft {
        animation-name: fadeInLeft;
        animation-duration: 1.5s;
      }
    `,
  },
  fadeInRight: {
    className: "fadeInRight",
    templateLiteral: `
      @keyframes fadeInRight {
        from {
          opacity: 0;
          transform: translate3d(2000px, 0, 0);
        }

        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }

      .fadeInRight {
        animation-name: fadeInRight;
        animation-duration: 1.5s;
      }
    `,
  },
  fadeInUp: {
    className: "fadeInUp",
    templateLiteral: `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translate3d(0, 2000px, 0);
        }

        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }

      .fadeInUp {
        animation-name: fadeInUpBig;
        animation-duration: 1.5s;
      }
    `,
  },
  bounceInDown: {
    className: "bounceInDown",
    templateLiteral: `
      @keyframes bounceInDown {
        from,
        60%,
        75%,
        90%,
        to {
          animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
        }

        0% {
          opacity: 0;
          transform: translate3d(0, -3000px, 0) scaleY(3);
        }

        60% {
          opacity: 1;
          transform: translate3d(0, 25px, 0) scaleY(0.9);
        }

        75% {
          transform: translate3d(0, -10px, 0) scaleY(0.95);
        }

        90% {
          transform: translate3d(0, 5px, 0) scaleY(0.985);
        }

        to {
          transform: translate3d(0, 0, 0);
        }
      }

      .bounceInDown {
        animation-name: bounceInDown;
        animation-duration: 1.5s;
      }
    `
  }
};
export const SWRVE_IAM_TEMPLATE_LITERAL = `
  <style>
    .${SWRVE_IAM_OVERLAY} {
      position: fixed;
      left: 0;
      top: 0;
      height: 100vh;
      width: 100vw;
      background-color: rgb(0,0,0,.8);
      z-index: 1050;
      display: none;
    }

    .${SWRVE_IAM_CANVAS} {
      position: relative;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }

    .fadeIn {
      animation-name: fadeIn;
      animation-duration: .5s;
    }
  </style>

  <div class='swrveIAM__overlay fadeIn'>
    <div class='swrveIAM__canvas'></div>
  </div>
`;

export const SWRVE_IAM_BUTTON_TEMPLATE_LITERAL = `
    <style>
      button {
        background: none;
        color: inherit;
        border: none;
        padding: 0;
        font: inherit;
        cursor: pointer;
        outline: inherit;
        position: absolute;
      }

      button:focus {
        box-shadow: 0 0 0 0.2rem rgb(0 123 255 / 50%);
      }

      button:hover {
        opacity: 60%;
      }
    </style>

    <button class="${SWRVE_IAM_BUTTON}" role="button"></button>
`;

  