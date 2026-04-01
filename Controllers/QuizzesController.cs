using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace quiz_app_2.Controllers
{
    public class QuizzesController : Controller
    {
        // GET: QuizzesController
        public ActionResult Index()
        {
            return View();
        }

        // GET: QuizzesController/Details/5
        public ActionResult Details(int id)
        {
            return View();
        }

        // GET: QuizzesController/Create
        public ActionResult Create()
        {
            return View();
        }

        // POST: QuizzesController/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(IFormCollection collection)
        {
            try
            {
                return RedirectToAction(nameof(Index));
            }
            catch
            {
                return View();
            }
        }

        // GET: QuizzesController/Edit/5
        public ActionResult Edit(int id)
        {
            return View();
        }

        // POST: QuizzesController/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(int id, IFormCollection collection)
        {
            try
            {
                return RedirectToAction(nameof(Index));
            }
            catch
            {
                return View();
            }
        }

        // GET: QuizzesController/Delete/5
        public ActionResult Delete(int id)
        {
            return View();
        }

        // POST: QuizzesController/Delete/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Delete(int id, IFormCollection collection)
        {
            try
            {
                return RedirectToAction(nameof(Index));
            }
            catch
            {
                return View();
            }
        }
    }
}
