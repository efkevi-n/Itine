import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { fetchPlaceSuggestions } from '@/api/places';
import { getRecentSearches, saveRecentSearch } from '@/utils/recentSearches';
import {
  POPULAR_DESTINATIONS,
  AUTOCOMPLETE_DEBOUNCE_MS,
  MAX_RECENT_SEARCHES,
  AUTOCOMPLETE_SUGGESTIONS_LIMIT,
} from '@/constants/destinations';
import type { DestinationSuggestion } from '@/types/destination';
import { theme } from '@/constants/theme';

const SEARCH_ICON = '🔍';

interface DestinationSearchProps {
  placeholder?: string;
  value: string;
  onSelect: (city: string, country: string) => void;
  editable?: boolean;
}

export function DestinationSearch({
  placeholder = 'e.g. Paris, Tokyo',
  value,
  onSelect,
  editable = true,
}: DestinationSearchProps) {
  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[]>([]);
  const [recent, setRecent] = useState<{ city: string; country: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  const loadRecent = useCallback(async () => {
    const list = await getRecentSearches();
    setRecent(list.map((r) => ({ city: r.city, country: r.country })));
  }, []);

  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([]);
      setShowList(true);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await fetchPlaceSuggestions(input.trim(), AUTOCOMPLETE_SUGGESTIONS_LIMIT);
        setSuggestions(list);
        setShowList(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  const handleSelect = useCallback(
    async (city: string, country: string) => {
      onSelect(city, country);
      setInput(`${city}, ${country}`);
      setShowList(false);
      setSuggestions([]);
      await saveRecentSearch({ city, country });
      loadRecent();
    },
    [onSelect, loadRecent]
  );

  const showPopular = !input.trim() && showList;
  const showRecent = showPopular && recent.length > 0;
  const showAutocomplete = input.trim().length > 0 && showList && suggestions.length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputRow}>
        <Text style={styles.searchIcon}>{SEARCH_ICON}</Text>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.subtext}
          value={input}
          onChangeText={setInput}
          onFocus={() => setShowList(true)}
          editable={editable}
        />
        {loading ? (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={styles.loader}
          />
        ) : null}
      </View>
      {showRecent ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent</Text>
          {recent.slice(0, MAX_RECENT_SEARCHES).map((r, i) => (
            <TouchableOpacity
              key={`${r.city}-${r.country}-${i}`}
              style={styles.suggestionRow}
              onPress={() => handleSelect(r.city, r.country)}
            >
              <Text style={styles.suggestionText}>
                {r.city}, {r.country}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {showPopular ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular</Text>
          {POPULAR_DESTINATIONS.map((d, i) => (
            <TouchableOpacity
              key={`${d.city}-${d.country}-${i}`}
              style={styles.suggestionRow}
              onPress={() => handleSelect(d.city, d.country)}
            >
              <Text style={styles.suggestionFlag}>{d.flag}</Text>
              <Text style={styles.suggestionText}>
                {d.city}, {d.country}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {showAutocomplete ? (
        <View style={styles.section}>
          {suggestions.map((item) => (
            <TouchableOpacity
              key={`${item.city}-${item.country}`}
              style={styles.suggestionRow}
              onPress={() => handleSelect(item.city, item.country)}
            >
              <Text style={styles.suggestionFlag}>{item.flag}</Text>
              <Text style={styles.suggestionText}>{item.city}, {item.country}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: theme.radius.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.radius.md,
  },
  searchIcon: { fontSize: theme.fonts.medium, marginRight: theme.radius.sm },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.fonts.regular,
    paddingVertical: 14,
    paddingRight: theme.radius.sm,
  },
  loader: { marginLeft: theme.radius.sm },
  section: { marginTop: theme.radius.sm },
  sectionTitle: {
    fontSize: theme.fonts.regular,
    color: theme.colors.subtext,
    marginBottom: 6,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: theme.radius.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.sm,
    marginBottom: 4,
  },
  suggestionFlag: { fontSize: theme.fonts.medium, marginRight: 8 },
  suggestionText: {
    fontSize: theme.fonts.regular,
    color: theme.colors.text,
    flex: 1,
  },
});
