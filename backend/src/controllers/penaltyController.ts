import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import penaltyService from "../services/penalty.service";

class PenaltyController {
  /**
   * Esegue manualmente il calcolo delle penalità giornaliere
   * Solo per admin
   */
  async runDailyPenalties(req: AuthRequest, res: Response) {
    try {
      const isAdmin = (req.user!.role?.permessi as any)?.isAdmin === true;
      if (!isAdmin) {
        return res.status(403).json({ error: "Non autorizzato" });
      }

      await penaltyService.applyDailyPenalties();

      res.json({
        success: true,
        message: "Penalità giornaliere applicate con successo"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new PenaltyController();
