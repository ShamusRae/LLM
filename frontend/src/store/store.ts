import { configureStore } from '@reduxjs/toolkit';
import { flowReducer } from './flowSlice';

export const store = configureStore({
  reducer: {
    flow: flowReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // ReactFlow has some non-serializable content that we need to ignore
        ignoredActions: ['flow/setNodes', 'flow/setEdges', 'flow/loadFlow'],
        ignoredPaths: ['flow.nodes', 'flow.edges'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 