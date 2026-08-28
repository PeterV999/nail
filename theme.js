(function () {
  const DEFAULT_THEME_KEY = "aqua_mint";

  const THEMES = [
    {
      key: "aqua_mint",
      name: "ฟ้ามิ้นต์",
      colors: ["#E3FDFD", "#CBF1F5", "#A6E3E9", "#71C9CE"],
      tokens: {
        bg: "#effcff",
        surface: "#fbfeff",
        surfaceStrong: "#ffffff",
        softPink: "#e4f8ff",
        softMint: "#ddfbf3",
        softLavender: "#eaf3ff",
        softPeach: "#fff1cf",
        ink: "#203d48",
        muted: "#607b86",
        line: "#c9e6ee",
        primary: "#14a9bf",
        primaryDark: "#087f96",
        aqua: "#78e4ef",
        coral: "#ff9fc2",
        sun: "#ffd66b",
        danger: "#c05665",
        disabled: "#e1eff3",
        shadow: "0 16px 36px rgba(20, 169, 191, .15)"
      }
    },
    {
      key: "ocean_pastel",
      name: "ทะเลสดใส",
      colors: ["#3674B5", "#578FCA", "#A1E3F9", "#D1F8EF"],
      tokens: {
        bg: "#eefbff",
        surface: "#fbfeff",
        surfaceStrong: "#ffffff",
        softPink: "#edf7ff",
        softMint: "#dffaf1",
        softLavender: "#eaf3ff",
        softPeach: "#fff7dc",
        ink: "#1e3956",
        muted: "#61788d",
        line: "#bfdfed",
        primary: "#3674b5",
        primaryDark: "#285d95",
        aqua: "#a1e3f9",
        coral: "#ff9fc2",
        sun: "#ffd66b",
        danger: "#bd5262",
        disabled: "#e3eef5",
        shadow: "0 16px 36px rgba(54, 116, 181, .14)"
      }
    },
    {
      key: "candy_cloud",
      name: "ลูกกวาดฟ้า",
      colors: ["#F7C8E0", "#DFFFD8", "#B4E4FF", "#95BDFF"],
      tokens: {
        bg: "#f8fbff",
        surface: "#fffafd",
        surfaceStrong: "#ffffff",
        softPink: "#ffeaf5",
        softMint: "#eaffea",
        softLavender: "#eaf3ff",
        softPeach: "#fff4d9",
        ink: "#31405a",
        muted: "#6b7890",
        line: "#d5e6f5",
        primary: "#6c9ced",
        primaryDark: "#4f78c5",
        aqua: "#b4e4ff",
        coral: "#f28dbd",
        sun: "#ffd66b",
        danger: "#c45c72",
        disabled: "#edf2f8",
        shadow: "0 16px 36px rgba(108, 156, 237, .14)"
      }
    },
    {
      key: "soft_blush",
      name: "ชมพูนุ่ม",
      colors: ["#F9F5F6", "#F8E8EE", "#FDCEDF", "#F2BED1"],
      tokens: {
        bg: "#fff7fb",
        surface: "#fffafd",
        surfaceStrong: "#ffffff",
        softPink: "#fde8f1",
        softMint: "#effbf8",
        softLavender: "#f3efff",
        softPeach: "#fff3df",
        ink: "#3d2f3a",
        muted: "#7a6975",
        line: "#efd7e3",
        primary: "#e86f9f",
        primaryDark: "#c84e80",
        aqua: "#9fdff1",
        coral: "#f2bed1",
        sun: "#ffd66b",
        danger: "#bb4e61",
        disabled: "#f2e8ee",
        shadow: "0 16px 36px rgba(200, 78, 128, .13)"
      }
    },
    {
      key: "warm_nail",
      name: "เล็บพีช",
      colors: ["#FFDCDC", "#FFF2EB", "#FFE8CD", "#FFD6BA"],
      tokens: {
        bg: "#fff7f2",
        surface: "#fffaf7",
        surfaceStrong: "#ffffff",
        softPink: "#ffdcdc",
        softMint: "#effbf8",
        softLavender: "#fff2eb",
        softPeach: "#ffe8cd",
        ink: "#3f2a35",
        muted: "#7b6670",
        line: "#efc9c4",
        primary: "#d85f7c",
        primaryDark: "#9f4058",
        aqua: "#aee8ee",
        coral: "#ffd6ba",
        sun: "#ffd66b",
        danger: "#b84a5e",
        disabled: "#f4e9e5",
        shadow: "0 16px 36px rgba(159, 64, 88, .13)"
      }
    },
    {
      key: "sky_peach",
      name: "ฟ้าพีช",
      colors: ["#B7E0FF", "#FFF5CD", "#FFCFB3", "#E78F81"],
      tokens: {
        bg: "#f3fbff",
        surface: "#fffdf8",
        surfaceStrong: "#ffffff",
        softPink: "#ffe7dc",
        softMint: "#ecfbf6",
        softLavender: "#eaf5ff",
        softPeach: "#fff5cd",
        ink: "#354052",
        muted: "#6f7989",
        line: "#d6e6ee",
        primary: "#e78f81",
        primaryDark: "#c97064",
        aqua: "#b7e0ff",
        coral: "#ffcfb3",
        sun: "#fff5cd",
        danger: "#b85762",
        disabled: "#edf0ef",
        shadow: "0 16px 36px rgba(231, 143, 129, .14)"
      }
    },
    {
      key: "lavender_mint",
      name: "ม่วงมิ้นต์",
      colors: ["#AAE3E2", "#D9ACF5", "#FFCEFE", "#FDEBED"],
      tokens: {
        bg: "#fbf6ff",
        surface: "#fffafd",
        surfaceStrong: "#ffffff",
        softPink: "#ffecfb",
        softMint: "#e4fbfa",
        softLavender: "#f0e5ff",
        softPeach: "#fff4df",
        ink: "#3a3152",
        muted: "#756d86",
        line: "#e2d5ec",
        primary: "#9c6bd1",
        primaryDark: "#7c4eb1",
        aqua: "#aae3e2",
        coral: "#ffcefe",
        sun: "#ffd66b",
        danger: "#b85773",
        disabled: "#eee8f3",
        shadow: "0 16px 36px rgba(124, 78, 177, .13)"
      }
    },
    {
      key: "fresh_mint",
      name: "เขียวสบายตา",
      colors: ["#DEF5E5", "#BCEAD5", "#9ED5C5", "#8EC3B0"],
      tokens: {
        bg: "#f1fbf5",
        surface: "#fbfffd",
        surfaceStrong: "#ffffff",
        softPink: "#fff0f6",
        softMint: "#def5e5",
        softLavender: "#eef4ff",
        softPeach: "#fff6dd",
        ink: "#253f38",
        muted: "#617a71",
        line: "#cbe7db",
        primary: "#4f9c86",
        primaryDark: "#357967",
        aqua: "#9ed5c5",
        coral: "#ffacbe",
        sun: "#ffd66b",
        danger: "#b75261",
        disabled: "#e5f0ec",
        shadow: "0 16px 36px rgba(53, 121, 103, .13)"
      }
    },
    {
      key: "sparkle_light",
      name: "ประกายพาสเทล",
      colors: ["#FCFFA6", "#C1FFD7", "#B5DEFF", "#CAB8FF"],
      tokens: {
        bg: "#fbfff2",
        surface: "#fdfffb",
        surfaceStrong: "#ffffff",
        softPink: "#f1edff",
        softMint: "#e7ffef",
        softLavender: "#ece8ff",
        softPeach: "#feffd6",
        ink: "#333b52",
        muted: "#707889",
        line: "#dbe9df",
        primary: "#7b70d7",
        primaryDark: "#6155bc",
        aqua: "#b5deff",
        coral: "#cab8ff",
        sun: "#fcffa6",
        danger: "#bd5968",
        disabled: "#eef1e8",
        shadow: "0 16px 36px rgba(97, 85, 188, .12)"
      }
    },
    {
      key: "clean_blue_lavender",
      name: "ฟ้าลาเวนเดอร์",
      colors: ["#FBFBFB", "#E8F9FF", "#C4D9FF", "#C5BAFF"],
      tokens: {
        bg: "#f7fbff",
        surface: "#fbfeff",
        surfaceStrong: "#ffffff",
        softPink: "#f0edff",
        softMint: "#e8f9ff",
        softLavender: "#e7e3ff",
        softPeach: "#fff6de",
        ink: "#28334f",
        muted: "#68758f",
        line: "#d4e2f7",
        primary: "#7a8ee8",
        primaryDark: "#596dcc",
        aqua: "#c4d9ff",
        coral: "#c5baff",
        sun: "#ffd66b",
        danger: "#b95768",
        disabled: "#ecf0f6",
        shadow: "0 16px 36px rgba(89, 109, 204, .12)"
      }
    }
  ];

  const themeByKey = new Map(THEMES.map((theme) => [theme.key, theme]));

  function theme(key) {
    return themeByKey.get(key) || themeByKey.get(DEFAULT_THEME_KEY);
  }

  function themeKey(key) {
    return theme(key).key;
  }

  function applyShopTheme(key) {
    const selected = theme(key);
    const tokens = selected.tokens;
    const target = document.body;
    if (!target) return selected;

    target.dataset.shopTheme = selected.key;
    Object.entries({
      "--bg": tokens.bg,
      "--surface": tokens.surface,
      "--surface-strong": tokens.surfaceStrong,
      "--soft-pink": tokens.softPink,
      "--soft-mint": tokens.softMint,
      "--soft-lavender": tokens.softLavender,
      "--soft-peach": tokens.softPeach,
      "--ink": tokens.ink,
      "--muted": tokens.muted,
      "--line": tokens.line,
      "--primary": tokens.primary,
      "--primary-dark": tokens.primaryDark,
      "--aqua": tokens.aqua,
      "--coral": tokens.coral,
      "--sun": tokens.sun,
      "--danger": tokens.danger,
      "--disabled": tokens.disabled,
      "--shadow": tokens.shadow
    }).forEach(([name, value]) => target.style.setProperty(name, value));

    target.style.background = [
      `radial-gradient(circle at 10% 10%, ${hexToRgba(tokens.aqua, 0.34)}, transparent 24%)`,
      `radial-gradient(circle at 88% 5%, ${hexToRgba(tokens.coral, 0.45)}, transparent 28%)`,
      `radial-gradient(circle at 82% 80%, ${hexToRgba(tokens.sun, 0.32)}, transparent 25%)`,
      `linear-gradient(120deg, ${hexToRgba(tokens.bg, 0.96)}, ${hexToRgba(tokens.surface, 0.96)} 44%, ${hexToRgba(tokens.softMint, 0.9)})`
    ].join(",");

    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute("content", tokens.primary);
    });

    return selected;
  }

  function hexToRgba(hex, alpha) {
    const clean = String(hex || "").replace("#", "");
    const value = clean.length === 3
      ? clean.split("").map((char) => char + char).join("")
      : clean.padEnd(6, "0").slice(0, 6);
    const number = Number.parseInt(value, 16);
    const r = (number >> 16) & 255;
    const g = (number >> 8) & 255;
    const b = number & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  window.BookingNailTheme = {
    defaultThemeKey: DEFAULT_THEME_KEY,
    options: THEMES,
    theme,
    themeKey,
    applyShopTheme
  };
}());
