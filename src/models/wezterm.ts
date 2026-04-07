export type WeztermPaneSize = {
  rows: number;
  cols: number;
  pixel_width: number;
  pixel_height: number;
  dpi: number;
};

export type WeztermPane = {
  window_id: number;
  tab_id: number;
  pane_id: number;
  workspace: string;
  size: WeztermPaneSize;
  title: string;
  cwd: string;
  cursor_x: number;
  cursor_y: number;
  cursor_shape: string;
  cursor_visibility: string;
  left_col: number;
  top_row: number;
  tab_title: string;
  window_title: string;
  is_active: boolean;
  is_zoomed: boolean;
  tty_name: string;
};
