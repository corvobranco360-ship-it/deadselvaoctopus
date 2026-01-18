
export const TILE_SIZE = 32;
export const INTERNAL_WIDTH = 640;
export const INTERNAL_HEIGHT = 360;
export const GRAVITY = 0.45;
export const JUMP_FORCE = -9;
export const PLAYER_SPEED = 3.5;

export const COLORS = {
  SKY_TOP: '#1a2a6c',
  SKY_BOTTOM: '#b21f1f',
  FOREST_DARK: '#0b1d12',
  FOREST_MID: '#1b3d2f',
  FOREST_LIGHT: '#2d5a27',
  GROUND: '#3d2b1f',
  GRASS: '#4caf50',
  PLAYER_CLOTHES: '#e0e0e0',
  PLAYER_SKIN: '#ffdbac',
  OCTOPUS: '#ff4081',
  SPIDER: '#7e57c2',
  MOSQUITO: '#d4e157',
  TRAP_METAL: '#90a4ae',
  ARROW_GOLD: '#ffd700',
  FLAG_RED: '#f44336',
  HEART: '#ff0000',
  AMMO_BOX: '#795548'
};

// Map legend: ' ' = empty, '#' = wall, 'B' = flag, 'H' = Heart, 'A' = Ammo
export const LEVELS = [
  {
    id: 1,
    arrows: 12,
    map: [
      "                                        ",
      "                   H                    ",
      "                                        ",
      "          ####            A             ",
      "                                        ",
      "    ####          ####                  ",
      "                        H          B    ",
      "########################################",
      "########################################"
    ],
    enemies: [
      { type: 'OCTOPUS', x: 250, y: 200 },
      { type: 'OCTOPUS', x: 450, y: 200 }
    ]
  },
  {
    id: 2,
    arrows: 15,
    map: [
      "                                        ",
      "    ####           ####        ####     ",
      "              A                         ",
      "          ####                 H        ",
      "                                        ",
      "    ####          ####                  ",
      "                                   B    ",
      "########################################",
      "########################################"
    ],
    enemies: [
      { type: 'SPIDER', x: 300, y: 0 },
      { type: 'OCTOPUS', x: 400, y: 200 },
      { type: 'SPIDER', x: 550, y: 0 }
    ]
  },
  {
    id: 3,
    arrows: 10,
    map: [
      "                                        ",
      "    ####   H       ####        ####     ",
      "                                        ",
      "          ####           A              ",
      "      ###          ####                 ",
      "    ####          ####                  ",
      "                                   B    ",
      "#########################     ##########",
      "#########################     ##########"
    ],
    enemies: [
      { type: 'MOSQUITO', x: 150, y: 100 },
      { type: 'OCTOPUS', x: 400, y: 200 },
      { type: 'SPIDER', x: 480, y: 0 }
    ]
  },
  {
    id: 4,
    arrows: 20,
    map: [
      "                                        ",
      "               ####     H      ####     ",
      "    ####                                ",
      "               ####      A              ",
      "          ####         ###              ",
      "     H                                  ",
      "    ####          ####        B         ",
      "                         ##########     ",
      "####################                    ",
      "####################                    "
    ],
    enemies: [
      { type: 'MOSQUITO', x: 200, y: 120 },
      { type: 'MOSQUITO', x: 500, y: 80 },
      { type: 'SPIDER', x: 180, y: 0 },
      { type: 'OCTOPUS', x: 120, y: 200 }
    ]
  },
  {
    id: 5,
    arrows: 8,
    map: [
      "                                        ",
      "    B              H                    ",
      "#######           #####                 ",
      "            A                           ",
      "          ####             #####        ",
      "                                        ",
      "    ####          ####         H        ",
      "                                        ",
      "########################################",
      "########################################"
    ],
    enemies: [
      { type: 'MOSQUITO', x: 450, y: 30 },
      { type: 'MOSQUITO', x: 50, y: 150 },
      { type: 'SPIDER', x: 280, y: 0 },
      { type: 'SPIDER', x: 480, y: 0 },
      { type: 'OCTOPUS', x: 350, y: 200 },
      { type: 'OCTOPUS', x: 600, y: 200 }
    ]
  }
];
