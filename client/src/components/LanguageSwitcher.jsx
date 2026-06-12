import React from "react";
import { FormControl, MenuItem, Select, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const languageOptions = [
  { value: "en", labelKey: "language.english" },
  { value: "hi", labelKey: "language.hindi" },
  { value: "mr", labelKey: "language.marathi" },
];

export default function LanguageSwitcher({ compact = false }) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage?.startsWith("hi")
    ? "hi"
    : i18n.resolvedLanguage?.startsWith("mr")
      ? "mr"
      : "en";

  const handleLanguageChange = (event) => {
    i18n.changeLanguage(event.target.value);
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {!compact && (
        <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
          {t("language.label")}
        </Typography>
      )}
      <FormControl size="small">
        <Select
          value={currentLanguage}
          onChange={handleLanguageChange}
          sx={{ minWidth: 120, bgcolor: "rgba(255, 255, 255, 0.9)" }}
        >
          {languageOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
