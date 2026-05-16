import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type LayoutType = 'list' | 'board';

export interface ViewStateConfig {
  layout: LayoutType;
  groupBy: string | null;
  visibleProperties: string[];
}

export interface ViewState {
  views: Record<string, ViewStateConfig>;
}

const initialState: ViewState = {
  views: {
    project: {
      layout: 'list',
      groupBy: null,
      visibleProperties: ['title', 'status', 'priority'],
    },
    task: {
      layout: 'board',
      groupBy: 'status',
      visibleProperties: ['title', 'status', 'priority', 'assignee'],
    }
  },
};

export const viewSlice = createSlice({
  name: 'view',
  initialState,
  reducers: {
    setLayout: (state, action: PayloadAction<{ entityType: string; layout: LayoutType }>) => {
      const { entityType, layout } = action.payload;
      if (!state.views[entityType]) {
        state.views[entityType] = { layout, groupBy: null, visibleProperties: [] };
      } else {
        state.views[entityType].layout = layout;
      }
    },
    setGroupBy: (state, action: PayloadAction<{ entityType: string; groupBy: string | null }>) => {
      const { entityType, groupBy } = action.payload;
      if (!state.views[entityType]) {
        state.views[entityType] = { layout: 'list', groupBy, visibleProperties: [] };
      } else {
        state.views[entityType].groupBy = groupBy;
      }
    },
    setVisibleProperties: (state, action: PayloadAction<{ entityType: string; visibleProperties: string[] }>) => {
      const { entityType, visibleProperties } = action.payload;
      if (!state.views[entityType]) {
        state.views[entityType] = { layout: 'list', groupBy: null, visibleProperties };
      } else {
        state.views[entityType].visibleProperties = visibleProperties;
      }
    },
    togglePropertyVisibility: (state, action: PayloadAction<{ entityType: string; property: string }>) => {
      const { entityType, property } = action.payload;
      if (!state.views[entityType]) {
        state.views[entityType] = { layout: 'list', groupBy: null, visibleProperties: [property] };
        return;
      }
      
      const properties = state.views[entityType].visibleProperties;
      const index = properties.indexOf(property);
      
      if (index === -1) {
        properties.push(property);
      } else {
        properties.splice(index, 1);
      }
    }
  },
});

export const { setLayout, setGroupBy, setVisibleProperties, togglePropertyVisibility } = viewSlice.actions;

export default viewSlice.reducer;
